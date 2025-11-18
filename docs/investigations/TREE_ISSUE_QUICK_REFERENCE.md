# Tree Toggle DataCloneError - Quick Reference

## The Error

```
DataCloneError: Failed to execute 'postMessage' on 'Worker': [object Array] could not be cloned
```

## Root Cause

Cesium entity objects (with non-serializable properties) are stored in Pinia store and passed to Web Workers.

## Critical Files & Line Numbers

### 1. WHERE TREES ARE TOGGLED

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/components/Layers.vue`**

- Lines 50-62: UI checkbox template
- Lines 205-216: `loadTrees()` function that initiates loading

### 2. WHERE TREES ARE LOADED

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/services/tree.js`**

- Lines 44-88: `loadTrees()` - loads 4 height categories in parallel
- Lines 126-186: `addTreesDataSource()` - processes loaded data
- Lines 238-246: `setPropertiesAndEmitEvent()` - stores data in Pinia and emits event ⚠️
- Line 300: Direct internal access to `_entityCollection._entities._array` ⚠️

### 3. WHERE DATASOURCES ARE CREATED

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/services/datasource.js`**

- Lines 157-186: `addDataSourceWithPolygonFix()` - creates Cesium datasource

### 4. WHERE CESIUM OBJECTS ARE STORED (PROBLEM!)

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/stores/propsStore.js`**

- Lines 152: `scatterPlotEntities` - NOT marked raw, may contain Cesium entities
- Lines 167-168: `setTreeEntities()` - stores with `markRaw()` but still non-serializable
- Lines 176-177: `setBuildingsDatasource()` - stores with `markRaw()` but still non-serializable

### 5. WHERE CESIUM OBJECTS ARE ACCESSED & MUTATED (PROBLEM!)

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/components/NearbyTreeArea.vue`**

- Lines 141-144: Gets entities from store in `newNearbyTreeDiagram()`
- Lines 204-206: Direct internal access to `_entityCollection._entities._array` ⚠️
- Lines 240, 299: Adds custom property `entity._properties.treeArea = value` ⚠️

### 6. STATE MANAGEMENT

**`/Users/lgates/repos/R4C-Cesium-Viewer/src/stores/toggleStore.js`**

- Lines 185-187: `setShowTrees()` - toggles visibility state

## What Gets Stored (The Problem Objects)

### Cesium Entity Properties (Non-Serializable)

```javascript
entity.polygon; // Cesium.PolygonGraphics with functions
entity.polygon.material; // ColorMaterialProperty with getters
entity.polygon.extrudedHeight; // Can be CallbackProperty (function!)
entity._properties._id; // Cesium Property wrapper, not plain object
entity._properties._korkeus_ka_m; // Cesium Property wrapper
entity._viewer; // Reference to Cesium.Viewer (circular!)
```

### Cesium DataSource Properties (Non-Serializable)

```javascript
datasource._entityCollection; // Internal collection
datasource._entityCollection._entities; // Internal entity array
datasource._dataSources; // References to other datasources
```

## The Data Flow That Causes The Problem

1. User toggles tree checkbox
2. `Layers.vue::loadTrees()` called
3. `Tree.loadTrees()` loads 4 categories in parallel
4. Cesium creates entities with non-serializable properties
5. **PROBLEM**: `Tree.setPropertiesAndEmitEvent()` stores these entities in Pinia
6. Event emitted → `NearbyTreeArea.vue` receives it
7. Component accesses Cesium objects from store
8. **PROBLEM**: Component mutates `entity._properties.treeArea`
9. **PROBLEM**: Component uses private `_entityCollection._entities._array`
10. If any code tries to serialize the store → DataCloneError crashes

## Why markRaw() Doesn't Solve This

`markRaw()` prevents Vue from making the objects reactive, BUT:

- It doesn't prevent browser from trying to serialize the data
- It doesn't prevent circular references
- It doesn't prevent functions/getters from existing
- If any code path tries `postMessage(propsStore.treeEntities)` → CRASH

## The Solution (General Approach)

Extract only serializable data from Cesium objects before storing:

```javascript
// INSTEAD OF:
propsStore.setTreeEntities(entities); // Stores non-serializable Cesium objects

// DO THIS:
const serializableTreeData = entities.map((entity) => ({
	id: entity.id,
	properties: {
		id: entity.properties?.id?.getValue?.(),
		area: entity.properties?.area_m2?.getValue?.(),
		// ... only plain values
	},
	// Don't store polygon, _viewer, _properties, etc.
}));
propsStore.setTreeData(serializableTreeData);

// Keep Cesium objects in a separate non-reactive container:
this.cesiumObjects = {
	treeEntities: entities, // No reactive wrapper
	buildingsDatasource: datasource,
};
```

## Files to Check First

1. **src/components/Layers.vue** - Toggle handler (lines 205-216)
2. **src/services/tree.js** - Tree service (lines 238-246)
3. **src/stores/propsStore.js** - Store definitions (lines 167-168, 176-177)
4. **src/components/NearbyTreeArea.vue** - Event listener (lines 141-144, 204-206)

## Verification Steps

To verify the issue:

1. Add console.log before storing: `console.log('Storing:', entities[0]);`
2. Check what properties are on the entity
3. Try to serialize it: `JSON.stringify(entity)` → will fail
4. Check if any code calls `postMessage()` with store data

## Related Files (Secondary Issues)

- `src/services/tree.js:300` - Unsafe internal access
- `src/components/NearbyTreeArea.vue:240, 299` - Entity property mutation
- `src/stores/propsStore.js:152` - scatterPlotEntities not marked raw
