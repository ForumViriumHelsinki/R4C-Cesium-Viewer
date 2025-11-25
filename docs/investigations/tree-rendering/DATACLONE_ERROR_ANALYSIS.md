# Tree Toggle DataCloneError Analysis

## Summary

The DataCloneError is caused by Cesium entities (with non-serializable internal properties) being stored in the Pinia `propsStore` and then being passed to Web Workers. While `markRaw()` is correctly used for some properties, the entities contain internal Cesium properties that cannot be serialized.

## Root Cause Flow

### 1. Tree Toggle Activation

**File**: `src/components/Layers.vue` (lines 205-216)

```javascript
const loadTrees = () => {
	toggleStore.setShowTrees(showTrees.value);
	const treeService = new Tree();

	showTrees.value
		? store.postalcode && !dataSourceService.getDataSourceByName('Trees')
			? treeService.loadTrees()
			: dataSourceService.changeDataSourceShowByName('Trees', true)
		: (dataSourceService.changeDataSourceShowByName('Trees', false),
			buildingService.resetBuildingEntities());
};
```

### 2. Tree Data Loading

**File**: `src/services/tree.js` (lines 44-88)

Tree service loads 4 height categories in parallel via unifiedLoader, each triggering `addTreesDataSource()`.

### 3. Datasource Creation with Non-Serializable Cesium Objects

**File**: `src/services/datasource.js` (lines 157-186)

```javascript
async addDataSourceWithPolygonFix(data, name) {
    return new Promise((resolve) => {
        Cesium.GeoJsonDataSource.load(data, {
            stroke: Cesium.Color.BLACK,
            fill: Cesium.Color.CRIMSON,
            strokeWidth: 3,
            clampToGround: true,
        })
        .then((data) => {
            // ... polygon configuration ...
            this.store.cesiumViewer.dataSources.add(data);
            resolve(data.entities.values);  // Returns Cesium entities array
        })
    });
}
```

The returned entities have internal Cesium properties like:

- `polygon` (Cesium.PolygonGraphics with functions/getters)
- `properties._value` (wrapped Cesium property accessors)
- Event listeners and callbacks
- Internal references to the viewer

### 4. Problematic Storage in Props Store

**File**: `src/stores/propsStore.js` (lines 167-168)

```javascript
setTreeEntities(entities) {
    this.treeEntities = markRaw(entities);  // Uses markRaw, but entities still contain non-serializable data
}
```

**File**: `src/services/tree.js` (lines 238-246)

```javascript
setPropertiesAndEmitEvent(data, entities, buildingsDataSource) {
    const propsStore = usePropsStore();
    propsStore.setTreeBuildingDistanceData(data);
    propsStore.setTreeEntities(entities);              // Stores Cesium entities
    propsStore.setBuildingsDatasource(buildingsDataSource);  // Stores Cesium datasource
    eventBus.emit('hideBuildingScatterPlot');
    eventBus.emit('newNearbyTreeDiagram');
}
```

### 5. Entity Mutation and Web Worker Communication

**File**: `src/components/NearbyTreeArea.vue` (lines 240, 299)

```javascript
// Sets custom properties on Cesium entities
entity._properties.treeArea = tree_area; // Adds property to internal Cesium object

// Later accesses via internal Cesium collection
for (let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++) {
	let entity = buildingsDataSource._entityCollection._entities._array[i];
	// ... uses entity._properties ...
}
```

When any component or Cesium worker tries to clone/serialize these entities for postMessage() calls, the serialization fails because:

1. **Functions & Getters**: Cesium.PolygonGraphics contains getter/setter methods
2. **Internal References**: Entities have circular references to parent viewer
3. **Event Listeners**: Entities may have attached event callbacks
4. **DOM References**: Some Cesium properties may reference DOM elements

## Technical Issues Found

### Issue 1: Non-Serializable Cesium Objects in Store

Cesium entities contain non-cloneable properties that cannot be passed to Web Workers.

**Location**:

- `propsStore.js:167-168` - `setTreeEntities()`
- `propsStore.js:176-177` - `setBuildingsDatasource()`

While `markRaw()` prevents Vue reactivity, it doesn't prevent the browser from attempting to serialize/clone the data.

### Issue 2: Unsafe Internal Property Access

Direct access to `_entityCollection._entities._array` breaks Cesium's API boundaries.

**Locations**:

- `src/components/NearbyTreeArea.vue:204-206`
- `src/services/tree.js:300`

### Issue 3: Mutating Cesium Entity Properties

Adding custom properties (`treeArea`) directly to entity `_properties` violates Cesium's data model.

**Locations**:

- `src/components/NearbyTreeArea.vue:240, 299`

### Issue 4: Missing Use of markRaw for All Cesium Objects

Some Cesium objects stored in the props store are wrapped with markRaw, but not all critical ones.

**Affected Properties in propsStore**:

- `scatterPlotEntities` (line 152) - NOT marked raw, likely contains Cesium entities
- `buildingsDatasource` (line 176-177) - IS marked raw ✓
- `treeEntities` (line 167-168) - IS marked raw ✓

## Data Flow for Tree Toggle

```
User clicks tree toggle
  ↓
Layers.vue: loadTrees()
  ↓
toggleStore.setShowTrees(true)
  ↓
Tree.loadTrees() - loads 4 height categories in parallel
  ↓
For each category: addTreesDataSource(data, koodi)
  ↓
datasource.addDataSourceWithPolygonFix()
  ↓
Cesium.GeoJsonDataSource.load() returns entities
  ↓
Tree.setTreePolygonMaterialColor() processes each entity
  ↓
Tree.fetchAndAddTreeDistanceData() (if Helsinki view)
  ↓
Tree.setPropertiesAndEmitEvent()
  ↓
propsStore.setTreeEntities(entities)  ← PROBLEMATIC: Stores Cesium entities
propsStore.setBuildingsDatasource()   ← PROBLEMATIC: Stores Cesium datasource
eventBus.emit('newNearbyTreeDiagram')
  ↓
NearbyTreeArea.vue listens for event
  ↓
Accesses propsStore.treeEntities and propsStore.buildingsDatasource
  ↓
Mutates entity._properties.treeArea = value
  ↓
Iterates via buildingsDataSource._entityCollection._entities._array
  ↓
[CRASH] If any code tries to serialize/post these entities to a Worker
```

## Code Locations Summary

| Issue                | File                                | Line     | Problem                                  |
| -------------------- | ----------------------------------- | -------- | ---------------------------------------- |
| Toggle Handler       | `src/components/Layers.vue`         | 205-216  | Initiates tree loading                   |
| Tree Loading         | `src/services/tree.js`              | 44-88    | Loads tree data in parallel              |
| Data Source Creation | `src/services/datasource.js`        | 157-186  | Returns non-serializable Cesium entities |
| Entity Storage       | `src/stores/propsStore.js`          | 167-168  | Stores entities with markRaw             |
| Event Emission       | `src/services/tree.js`              | 238-246  | Emits event with Cesium objects in store |
| Component Access     | `src/components/NearbyTreeArea.vue` | 141-144  | Uses stored entities from event          |
| Internal Access      | `src/components/NearbyTreeArea.vue` | 204-206  | Direct \_entityCollection access         |
| Entity Mutation      | `src/components/NearbyTreeArea.vue` | 240, 299 | Adds custom properties to Cesium objects |
| Internal Access      | `src/services/tree.js`              | 300      | Direct \_entityCollection access         |

## Cesium Property Structure Issue

Cesium entities have this problematic structure:

```javascript
entity = {
	polygon: {
		material: [Cesium.ColorMaterialProperty], // Non-serializable
		extrudedHeight: [Cesium.CallbackProperty], // Non-serializable
		arcType: [Cesium.ArcType.GEODESIC],
		// ... getters/setters ...
	},
	_properties: {
		_id: { _value: 123 }, // Wrapped in Cesium objects
		_area_m2: { _value: 500 },
		treeArea: 1500, // Custom property added here
	},
	_viewer: [Cesium.Viewer], // Circular reference
	// ... event listeners ...
};
```

When this is passed to a Web Worker via `postMessage()`, the browser cannot clone:

- The `_viewer` circular reference
- The getter/setter functions in `polygon`
- The Cesium property wrapper objects

## Recommended Fixes

1. **Extract Serializable Data Only**: Instead of storing Cesium entities, extract only the data you need (IDs, names, properties) into plain JavaScript objects.

2. **Use Cesium API Properly**: Access entities through the public Cesium API (`dataSources.entities.values`) instead of private `_entityCollection._entities._array`.

3. **Store References Separately**: Keep references to the Cesium datasource in a non-Vue-reactive container (using `markRaw`), and store the extracted data separately in the Pinia store.

4. **Separate Concerns**: Keep visualization data (for the map) separate from analysis data (for charts). Don't mix Cesium objects with Vue state.

5. **Apply markRaw Consistently**: If storing any Cesium objects, ensure ALL of them use `markRaw()` to prevent Vue reactivity attempts.
