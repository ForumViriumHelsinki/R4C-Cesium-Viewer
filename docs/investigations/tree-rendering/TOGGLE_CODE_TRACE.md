# Tree Toggle: Code Execution Trace

## Call Stack When Toggling Trees

```
User clicks "Trees" checkbox
    ↓
Layers.vue@205-216: loadTrees()
    ↓
toggleStore.setShowTrees(showTrees.value) [sets state: showTrees = true]
    ↓
new Tree() → Tree constructor()
    ↓
Tree.loadTrees() [src/services/tree.js@44-88]
    │
    ├─ Creates loading configs for all 4 tree height categories:
    │   - "221": >20m (tallest)
    │   - "222": 15-20m
    │   - "223": 10-15m
    │   - "224": 2-10m (shortest)
    │
    └─ unifiedLoader.loadLayers([configs]) [parallel loading]
        ↓
        For each koodi category:
            ↓
            unifiedLoader processes layer config
                ↓
                Tree.addTreesDataSource(data, koodi) [src/services/tree.js@126-186]
                    ↓
                    datasource.addDataSourceWithPolygonFix(data, "Trees" + koodi)
                    [src/services/datasource.js@157-186]
                        ↓
                        Cesium.GeoJsonDataSource.load(data, options)
                            └─ Returns Cesium DataSource with entities
                        ↓
                        Add datasource to viewer:
                        store.cesiumViewer.dataSources.add(data)
                        ↓
                        Set arc type on polygon entities:
                        entity.polygon.arcType = Cesium.ArcType.GEODESIC
                        ↓
                        resolve(data.entities.values)
                        └─ Returns array of Cesium Entity objects
                    ↓
                    Adaptive batch processing (loop through entities)
                        ↓
                        For each entity:
                            ├─ Get height: entity._properties._korkeus_ka_m._value
                            ├─ Set material color: entity.polygon.material = ...
                            └─ Set extrusion: entity.polygon.extrudedHeight = ...
                    ↓
                    If Helsinki view:
                        ↓
                        Tree.fetchAndAddTreeDistanceData(entities)
                            [src/services/tree.js@193-226]
                            ↓
                            fetch(treeBuildingDistance API)
                                ↓
                                Promise .then():
                                    ↓
                                    Tree.setPropertiesAndEmitEvent(data, entities, buildingsDatasource)
                                    [src/services/tree.js@239-246]
                                        ↓
                                        propsStore.setTreeBuildingDistanceData(data)
                                        ├─ Sets: this.treeBuildingDistanceData = data ✓ (plain JSON)
                                        ↓
                                        propsStore.setTreeEntities(entities)
                                        ├─ Sets: this.treeEntities = markRaw(entities) ✗ (Cesium objects!)
                                        ↓
                                        propsStore.setBuildingsDatasource(buildingsDatasource)
                                        ├─ Sets: this.buildingsDatasource = markRaw(datasource) ✗ (Cesium object!)
                                        ↓
                                        eventBus.emit('hideBuildingScatterPlot')
                                        ↓
                                        eventBus.emit('newNearbyTreeDiagram')
                                            ↓
                                            [EVENT LISTENERS TRIGGERED]
                                            ↓
                                            NearbyTreeArea.vue@124:
                                            mounted() {
                                                this.unsubscribe = eventBus.on('newNearbyTreeDiagram',
                                                    this.newNearbyTreeDiagram)
                                            }
                                            ↓
                                            NearbyTreeArea.vue@133-147: newNearbyTreeDiagram()
                                                ↓
                                                propsStore = usePropsStore()
                                                ↓
                                                combineDistanceAndTreeData(
                                                    propsStore.treeBuildingDistanceData,
                                                    propsStore.treeEntities  ← Gets Cesium entities!
                                                )
                                                ↓
                                                createTreeBuildingPlotMap(
                                                    sumPAlaM2Map,
                                                    propsStore.buildingsDatasource ← Gets Cesium datasource!
                                                )
                                                ↓
                                                Iterates buildings datasource:
                                                for (let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++)
                                                    ↓
                                                    entity = buildingsDataSource._entityCollection._entities._array[i]
                                                    ↓
                                                    entity._properties.treeArea = tree_area  ← Mutates!
```

## Key Data Structures Being Passed

### Tree Entities Array (Non-Serializable)

```javascript
treeEntities = [
    {
        id: "Tree001",
        polygon: Cesium.PolygonGraphics {
            material: Cesium.ColorMaterialProperty {
                color: Cesium.Color.FORESTGREEN,
                _definitionChanged: Event,
                // ... getters/setters ...
            },
            extrudedHeight: 22.5,  // or CallbackProperty
            arcType: Cesium.ArcType.GEODESIC,
            // ... more graphics properties ...
        },
        _properties: {
            _id: { _value: "tree_123" },
            _korkeus_ka_m: { _value: 20 },
            _kuvaus: { _value: "Puusto yli 20 m" },
            treeArea: 1500,  // Custom property added by NearbyTreeArea.vue
        },
        position: Cesium.Cartesian3,
        _viewer: Cesium.Viewer,  // Circular reference!
        // ... event handlers ...
    },
    // ... more entities ...
]
```

### Buildings DataSource (Non-Serializable)

```javascript
buildingsDatasource = Cesium.GeoJsonDataSource {
    _dataSources: [...],
    _entities: CollectionBase {
        _array: [
            {
                id: "Building001",
                polygon: Cesium.PolygonGraphics { /* ... */ },
                _properties: {
                    _id: { _value: "bldg_456" },
                    avgheatexposuretobuilding: { _value: 0.75 },
                    _area_m2: { _value: 500 },
                    treeArea: 2000,  // Custom property added
                },
                // ... more entities ...
            }
        ]
    },
    // ... datasource properties ...
}
```

## Problem: When Does Serialization Happen?

The crash occurs when:

1. **Cesium uses Web Workers internally** - CesiumJS may use Workers for data processing
2. **Browser extensibility APIs attempt cloning** - Some browser features may try to serialize store state
3. **Developer tools/extensions** - DevTools or extensions might try to inspect the store
4. **Testing/debugging frameworks** - Jest, Vitest, or other test runners might serialize state

The line that triggers serialization:

```javascript
// This triggers the clone error when any code path tries to postMessage() the entity:
postMessage({ entities: treeEntities }); // Browser can't clone Cesium objects!
```

## Structural Issues Summary

### Issue 1: Circular References

```
entity._viewer → viewer
viewer.dataSources → contains entity
```

Creates circular reference that cannot be cloned.

### Issue 2: Functions & Getters

```javascript
entity.polygon.material; // Contains getter functions
entity.polygon.arcType; // Contains Cesium enums that may have methods
```

### Issue 3: Internal Cesium Wrappers

```javascript
entity._properties._id; // Not a plain value, a Cesium Property object
entity._properties._korkeus_ka_m; // Also wrapped
```

### Issue 4: Unsafe Direct Access

```javascript
// Breaks Cesium's encapsulation:
buildingsDataSource._entityCollection._entities._array;

// Should use public API:
buildingsDataSource.entities.values;
```

## Files Involved

1. **Toggle UI**: `src/components/Layers.vue:50-62`
2. **Toggle Logic**: `src/components/Layers.vue:205-216`
3. **Store State**: `src/stores/toggleStore.js:185-187` (setShowTrees)
4. **Data Loading**: `src/services/tree.js:44-88` (loadTrees)
5. **Entity Processing**: `src/services/tree.js:126-186` (addTreesDataSource)
6. **Datasource Creation**: `src/services/datasource.js:157-186` (addDataSourceWithPolygonFix)
7. **Store Management**: `src/stores/propsStore.js:167-178` (setTreeEntities, setBuildingsDatasource)
8. **Event Emission**: `src/services/tree.js:238-246` (setPropertiesAndEmitEvent)
9. **Event Handling**: `src/components/NearbyTreeArea.vue:123-147` (mounted, newNearbyTreeDiagram)
10. **Data Mutation**: `src/components/NearbyTreeArea.vue:204-300` (createTreeBuildingPlotMap)
11. **Internal Access**: `src/services/tree.js:289-315` (resetTreeEntities)

## The Core Problem

The application conflates two concerns:

- **Visualization objects** (Cesium entities/datasources) - meant for 3D rendering, non-serializable
- **Analysis data** (tree proximity, distances, exposure) - meant for charts, should be serializable

Storing Cesium objects in Pinia makes them reactive (though markRaw prevents this), and exposes them to any code that might try to serialize the store state, causing the DataCloneError.
