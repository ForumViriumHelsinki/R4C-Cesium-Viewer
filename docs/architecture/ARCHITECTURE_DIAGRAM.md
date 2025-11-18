# Tree Toggle Architecture & Data Flow Diagram

## Current (Problematic) Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERFACE                                                   │
│ src/components/Layers.vue                                        │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ <input v-model="showTrees" @change="loadTrees" />            ││
│ └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOGGLE STATE MANAGEMENT                                          │
│ src/stores/toggleStore.js                                        │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ showTrees: boolean (true/false)                              ││
│ │ setShowTrees(value)                                          ││
│ └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TREE SERVICE - DATA LOADING                                      │
│ src/services/tree.js                                             │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ loadTrees()                                                  ││
│ │ ├─ Load 4 height categories in parallel                      ││
│ │ ├─ createDataSource for each (koodi: 221,222,223,224)        ││
│ │ └─ Return Cesium entities array                              ││
│ │                                                              ││
│ │ addTreesDataSource(data, koodi)                              ││
│ │ ├─ Call datasource.addDataSourceWithPolygonFix()             ││
│ │ ├─ Color trees by height category                            ││
│ │ └─ Extrude trees by height value                             ││
│ │                                                              ││
│ │ setPropertiesAndEmitEvent(data, entities, datasource) ⚠️    ││
│ │ ├─ propsStore.setTreeEntities(entities)  ✗ NON-SERIALIZABLE ││
│ │ ├─ propsStore.setBuildingsDatasource()   ✗ NON-SERIALIZABLE ││
│ │ └─ eventBus.emit('newNearbyTreeDiagram')                     ││
│ └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CESIUM VIEWER - VISUALIZATION                                    │
│ (Already added to viewer, but entities stored in Pinia!)         │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ viewer.dataSources.add(treeDataSource)                       ││
│ │                                                              ││
│ │ Renders 4 tree height layers:                                ││
│ │ ├─ Trees221: >20m (dark green, extruded)                     ││
│ │ ├─ Trees222: 15-20m (green)                                  ││
│ │ ├─ Trees223: 10-15m (light green)                            ││
│ │ └─ Trees224: 2-10m (lightest green)                          ││
│ └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PINIA STATE STORE - ANALYSIS DATA                               │
│ src/stores/propsStore.js                                        │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ setTreeEntities(entities)                                    ││
│ │ ├─ this.treeEntities = markRaw(entities)                     ││
│ │ └─ Contains: Cesium.Entity[] with non-serializable props     ││
│ │                                                              ││
│ │ setBuildingsDatasource(datasource)                           ││
│ │ ├─ this.buildingsDatasource = markRaw(datasource)            ││
│ │ └─ Contains: Cesium.GeoJsonDataSource (non-serializable)     ││
│ │                                                              ││
│ │ setTreeBuildingDistanceData(data)                            ││
│ │ └─ this.treeBuildingDistanceData = data ✓ SERIALIZABLE       ││
│ └──────────────────────────────────────────────────────────────┘│
└────────────────────────┬──────────────────────────────────────────┘
                         │
                    EVENT BUS
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ CHART COMPONENT - TREE ANALYSIS                                  │
│ src/components/NearbyTreeArea.vue                               │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ mounted()                                                    ││
│ │ └─ Listen for 'newNearbyTreeDiagram' event                   ││
│ │                                                              ││
│ │ newNearbyTreeDiagram()                                       ││
│ │ ├─ Get entities: propsStore.treeEntities  ⚠️ NON-SERIALIZABLE││
│ │ ├─ Get datasource: propsStore.buildingsDatasource ⚠️         ││
│ │ │                                                            ││
│ │ │ combineDistanceAndTreeData(data, entities)                ││
│ │ │ createTreeBuildingPlotMap(sumPAlaM2Map, datasource)       ││
│ │ │ ├─ Access: datasource._entityCollection._entities._array ││
│ │ │ │         (UNSAFE INTERNAL ACCESS) ⚠️                     ││
│ │ │ └─ Mutate: entity._properties.treeArea = value ⚠️         ││
│ │ │                                                            ││
│ │ └─ createTreesNearbyBuildingsPlot() - Create D3 chart        ││
│ │                                                              ││
│ │ Result: SVG chart showing tree proximity to buildings        ││
│ └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Data Structure Inside Store (Non-Serializable)

```
propsStore.treeEntities = [
  {
    id: "tree_xyz",
    polygon: Cesium.PolygonGraphics {       // ✗ FUNCTION
      material: ColorMaterialProperty,       // ✗ GETTER
      extrudedHeight: 22.5,
      arcType: ArcType.GEODESIC,
      // ... 50+ internal properties
    },
    _properties: {
      _id: { _value: 123 },                 // ✗ WRAPPED OBJECT
      _korkeus_ka_m: { _value: 20 },        // ✗ WRAPPED OBJECT
      treeArea: 1500                         // Custom property
    },
    _viewer: Cesium.Viewer,                 // ✗ CIRCULAR REFERENCE
    position: Cartesian3,
    // ... event listeners, callbacks, internal state
  },
  // ... 1000s more entities
]

propsStore.buildingsDatasource = Cesium.GeoJsonDataSource {
  _entityCollection: {                       // ✗ PRIVATE
    _entities: {                             // ✗ PRIVATE
      _array: [ /* entities */ ]             // ✗ DIRECT ACCESS
    }
  },
  // ... all non-serializable Cesium internals
}
```

## Problem: When Serialization Happens

```
Any of these operations trigger the error:

1. Web Worker Communication
   ┌─────────────────────────┐
   │ postMessage({            │
   │   entities: [...]        │  ← DataCloneError!
   │ })                       │
   └─────────────────────────┘

2. Browser DevTools Inspection
   ┌─────────────────────────┐
   │ Browser tries to clone   │
   │ store for inspection     │  ← DataCloneError!
   └─────────────────────────┘

3. Testing/Debugging Framework
   ┌─────────────────────────┐
   │ JSON.stringify() or      │
   │ serialization attempt    │  ← DataCloneError!
   └─────────────────────────┘

4. Browser Extensions
   ┌─────────────────────────┐
   │ Extension tries to       │
   │ inspect/serialize state  │  ← DataCloneError!
   └─────────────────────────┘
```

## Key Issue: Mixed Concerns

```
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ VISUALIZATION LAYER              │  │ ANALYSIS LAYER                   │
│ (For Cesium 3D Map)              │  │ (For Charts & Data)              │
├──────────────────────────────────┤  ├──────────────────────────────────┤
│ • Cesium entities                │  │ • Tree distance data             │
│ • Cesium datasources             │  │ • Building properties            │
│ • Polygon graphics               │  │ • Chart configurations           │
│ • Material properties            │  │ • Plot data points               │
│ • 3D positions                   │  │ • Heat exposure values           │
│                                  │  │                                  │
│ NON-SERIALIZABLE ✗               │  │ SERIALIZABLE ✓                   │
│ Should NOT be in Pinia store     │  │ SHOULD be in Pinia store         │
└──────────────────────────────────┘  └──────────────────────────────────┘
        ⬆️ Currently mixed! ⬇️
     Same Pinia store =
      DataCloneError
```

## Suggested Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ PINIA STORES (SEPARATED CONCERNS)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ TOGGLE STORE (Reactive)                                         │
│ ├─ showTrees: boolean                                           │
│ └─ setShowTrees()                                               │
│                                                                  │
│ PROPS STORE (Reactive - SERIALIZABLE ONLY) ✓                    │
│ ├─ treeBuildingDistanceData: Object[] (plain JSON)              │
│ ├─ treeChartConfig: { labels, values } (plain JSON)             │
│ └─ setTreeData()                                                │
│                                                                  │
│ CESIUM STORE (Non-Reactive) - Using WeakMap or private field   │
│ ├─ cesiumObjects: Map {                                         │
│ │   treeEntities: Cesium.Entity[]                               │
│ │   buildingsDatasource: Cesium.GeoJsonDataSource               │
│ │ }                                                             │
│ └─ setCesiumObjects()                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
     │                            │
     │                            │
     ▼                            ▼
  SAFE FOR SERIALIZATION    ONLY VISUALIZATION
  (Can be postMessage'd)     (Internal to app)
```

## Summary of Issues

| Issue                                       | Location                            | Impact                     | Severity |
| ------------------------------------------- | ----------------------------------- | -------------------------- | -------- |
| Non-serializable Cesium entities in store   | propsStore.setTreeEntities()        | DataCloneError             | CRITICAL |
| Non-serializable Cesium datasource in store | propsStore.setBuildingsDatasource() | DataCloneError             | CRITICAL |
| Unsafe private property access              | NearbyTreeArea.vue:204              | API breakage risk          | HIGH     |
| Mutating Cesium entity properties           | NearbyTreeArea.vue:240,299          | Data corruption risk       | HIGH     |
| Unsafe private property access              | tree.js:300                         | API breakage risk          | HIGH     |
| Missing markRaw() for entities              | propsStore.scatterPlotEntities      | Potential reactivity issue | MEDIUM   |
