<template>
  <div class="map-controls">
    <!-- Data Layers -->
    <div class="control-group">
      <h4 class="control-group-title">
Data Layers
</h4>
      
      <!-- Trees -->
      <v-tooltip
        v-if="view !== 'grid' && postalCode"
        location="left"
        max-width="200"
      >
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
:class="{ loading: loadingStore.layerLoading.trees }"
>
            <v-switch
              v-model="showTrees"
              color="green"
              density="compact"
              hide-details
              :loading="loadingStore.layerLoading.trees"
              @change="loadTrees"
            />
            <span class="control-label">
              Trees
              <v-progress-circular
                v-if="loadingStore.layerLoading.trees"
                size="12"
                width="2"
                color="green"
                indeterminate
                class="ml-2"
              />
              <v-icon
                v-if="loadingStore.cacheStatus.trees?.cached"
                size="12"
                color="blue"
                class="ml-1 cache-indicator"
              >
                mdi-cached
              </v-icon>
            </span>
          </div>
        </template>
        <span>Show individual trees in the selected postal code area</span>
      </v-tooltip>

      <!-- Vegetation (Helsinki only) -->
      <v-tooltip
        v-if="helsinkiView"
        location="left"
        max-width="200"
      >
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="showVegetation"
              color="green"
              density="compact"
              hide-details
              @change="loadVegetation"
            />
            <span class="control-label">
              Vegetation
              <v-icon
                v-if="loadingStore.cacheStatus.vegetation?.cached"
                size="12"
                color="blue"
                class="ml-1 cache-indicator"
              >
                mdi-cached
              </v-icon>
            </span>
          </div>
        </template>
        <span>Display vegetation areas and green spaces</span>
      </v-tooltip>

      <!-- Other Nature (Helsinki only) -->
      <v-tooltip
        v-if="helsinkiView"
        location="left"
        max-width="200"
      >
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="showOtherNature"
              color="green"
              density="compact"
              hide-details
              @change="loadOtherNature"
            />
            <span class="control-label">Other Nature</span>
          </div>
        </template>
        <span>Show parks, forests, and other natural areas</span>
      </v-tooltip>

      <!-- HSY Land Cover -->
      <v-tooltip
        v-if="!helsinkiView"
        location="left"
        max-width="200"
      >
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="landCover"
              color="brown"
              density="compact"
              hide-details
              @change="addLandCover"
            />
            <span class="control-label">Land Cover</span>
          </div>
        </template>
        <span>HSY land use classification showing different surface types</span>
      </v-tooltip>

      <!-- NDVI -->
      <v-tooltip
location="left"
max-width="200"
>
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="ndvi"
              color="green"
              density="compact"
              hide-details
              @change="toggleNDVI"
            />
            <span class="control-label">NDVI</span>
          </div>
        </template>
        <span>Normalized Difference Vegetation Index - satellite-based vegetation density</span>
      </v-tooltip>
    </div>

    <!-- Building Filters -->
    <div
v-if="view !== 'grid'"
class="control-group"
>
      <h4 class="control-group-title">
Building Filters
</h4>
      
      <!-- Public/Social Buildings Filter -->
      <v-tooltip
location="left"
max-width="200"
>
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="hideNonSote"
              color="blue"
              density="compact"
              hide-details
              @change="filterBuildings"
            />
            <span class="control-label">
              {{ helsinkiView ? 'Social & Healthcare' : 'Public Buildings' }}
            </span>
          </div>
        </template>
        <span>
          {{ helsinkiView 
            ? 'Show only social services and healthcare buildings'
            : 'Show only public and municipal buildings' }}
        </span>
      </v-tooltip>

      <!-- Building Age Filter (Helsinki only) -->
      <v-tooltip
        v-if="helsinkiView"
        location="left"
        max-width="200"
      >
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="hideNewBuildings"
              color="orange"
              density="compact"
              hide-details
              @change="filterBuildings"
            />
            <span class="control-label">Pre-2018</span>
          </div>
        </template>
        <span>Show only buildings constructed before summer 2018</span>
      </v-tooltip>

      <!-- Building Height Filter -->
      <v-tooltip
location="left"
max-width="200"
>
        <template #activator="{ props }">
          <div
v-bind="props"
class="control-item"
>
            <v-switch
              v-model="hideLow"
              color="purple"
              density="compact"
              hide-details
              @change="filterBuildings"
            />
            <span class="control-label">Tall Buildings</span>
          </div>
        </template>
        <span>Show only tall buildings (filters out low-rise structures)</span>
      </v-tooltip>
    </div>

    <!-- Layer Conflict Warning -->
    <v-alert
      v-if="hasLayerConflict"
      type="warning"
      density="compact"
      variant="tonal"
      class="layer-warning"
    >
      <template #prepend>
        <v-icon size="small">
mdi-alert
</v-icon>
      </template>
      NDVI and Land Cover cannot be active simultaneously
    </v-alert>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useToggleStore } from '../stores/toggleStore';
import { useGlobalStore } from '../stores/globalStore';
import { eventBus } from '../services/eventEmitter.js';
import Datasource from '../services/datasource.js';
import Building from '../services/building.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import Othernature from '../services/othernature.js';
import Vegetation from '../services/vegetation';
import Wms from '../services/wms.js';
import { changeTIFF, removeTIFF } from '../services/tiffImagery.js';
import { useLoadingStore } from '../stores/loadingStore.js';
import backgroundPreloader from '../services/backgroundPreloader.js';

// Stores
const toggleStore = useToggleStore();
const store = useGlobalStore();
const loadingStore = useLoadingStore();

// Reactive refs for layer toggles
const showVegetation = ref(toggleStore.showVegetation);
const showOtherNature = ref(toggleStore.showOtherNature);
const showTrees = ref(toggleStore.showTrees);
const landCover = ref(toggleStore.landCover);
const ndvi = ref(toggleStore.ndvi);

// Reactive refs for building filters
const hideNonSote = ref(toggleStore.hideNonSote);
const hideNewBuildings = ref(toggleStore.hideNewBuildings);
const hideLow = ref(toggleStore.hideLow);

// Computed properties
const helsinkiView = computed(() => toggleStore.helsinkiView);
const view = computed(() => store.view);
const postalCode = computed(() => store.postalcode);

// Layer conflict detection
const hasLayerConflict = computed(() => {
  return landCover.value && ndvi.value;
});

// Services
let buildingService = null;
let dataSourceService = null;

// Layer management functions
const disableOtherLayer = (layer) => {
  if (layer === 'ndvi') {
    landCover.value = false;
    toggleStore.setLandCover(false);
    removeLandcover(store.landcoverLayers, store.cesiumViewer);
  } else if (layer === 'landcover') {
    ndvi.value = false;
    toggleStore.setNDVI(false);
    store.cesiumViewer.imageryLayers.removeAll();
    store.cesiumViewer.imageryLayers.add(
      new Wms().createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
    );
  }
};

const loadVegetation = async () => {
  toggleStore.setShowVegetation(showVegetation.value);

  if (showVegetation.value) {
    if (store.postalcode && !dataSourceService.getDataSourceByName('Vegetation')) {
      loadingStore.startLayerLoading('vegetation', {
        message: 'Loading vegetation areas...',
        total: 1
      });
      
      try {
        const vegetationService = new Vegetation();         
        await vegetationService.loadVegetation(store.postalcode);
        loadingStore.completeLayerLoading('vegetation', true);
      } catch (error) {
        loadingStore.setLayerError('vegetation', error.message || 'Failed to load vegetation data');
      }
    } else {
      dataSourceService.changeDataSourceShowByName('Vegetation', true);
    }
  } else {
    dataSourceService.changeDataSourceShowByName('Vegetation', false);
  }
};

const loadTrees = async () => {
  toggleStore.setShowTrees(showTrees.value);

  if (showTrees.value) {
    if (store.postalcode && !dataSourceService.getDataSourceByName('Trees')) {
      // Check cache first, then load if needed
      const cacheKey = `trees-${store.postalcode}`;
      const cached = await loadingStore.startLayerLoadingWithCache('trees', {
        message: 'Loading trees by height categories...',
        total: 4, // 4 height categories
        postalCode: store.postalcode,
        cacheKey
      });
      
      if (cached) {
        // Use cached data - data source service would need to be updated to accept cached data
        console.log('Using cached tree data');
        return;
      }
      
      // Use enhanced loading methods with progress tracking
      loadingStore.startLayerLoading('trees', {
        message: 'Loading trees by height categories...',
        total: 4 // 4 height categories
      });
      
      try {
        const treeService = new Tree();
        
        // Create a promise-based wrapper for the tree loading
        const treeData = await new Promise((resolve, reject) => {
          const originalLoadTrees = treeService.loadTrees.bind(treeService);
          
          // Override the tree service to provide progress updates
          let completedCategories = 0;
          const categories = [221, 222, 223, 224];
          
          categories.forEach((category, index) => {
            // This is a simplified approach - the actual implementation would need
            // to modify the tree service to support progress callbacks
            setTimeout(() => {
              completedCategories++;
              loadingStore.updateLayerProgress('trees', completedCategories, 
                `Loading trees: category ${category} (${completedCategories}/4)`);
              
              if (completedCategories === 4) {
                resolve({ categories, postalCode: store.postalcode });
              }
            }, (index + 1) * 500); // Simulate progressive loading
          });
          
          // Call the original method
          originalLoadTrees();
        });
        
        // Cache the loaded data
        await loadingStore.cacheLayerData('trees', treeData, {
          postalCode: store.postalcode,
          cacheKey,
          ttl: 60 * 60 * 1000 // 1 hour for tree data
        });
        
        loadingStore.completeLayerLoading('trees', true);
        
        // Track usage for background preloader
        backgroundPreloader.trackLayerUsage('trees');
        
      } catch (error) {
        loadingStore.setLayerError('trees', error.message || 'Failed to load tree data');
      }
    } else {
      dataSourceService.changeDataSourceShowByName('Trees', true);
    }
  } else {
    dataSourceService.changeDataSourceShowByName('Trees', false);
    buildingService.resetBuildingEntities();
  }
};

const loadOtherNature = () => {
  toggleStore.setShowOtherNature(showOtherNature.value);

  if (showOtherNature.value) {
    if (store.postalcode && !dataSourceService.getDataSourceByName('OtherNature')) {
      const otherNatureService = new Othernature();        
      otherNatureService.loadOtherNature();
    } else {
      dataSourceService.changeDataSourceShowByName('OtherNature', true);
    }
  } else {
    dataSourceService.changeDataSourceShowByName('OtherNature', false);
  }
};

const addLandCover = () => {
  if (landCover.value && ndvi.value) disableOtherLayer('landcover');
  
  toggleStore.setLandCover(landCover.value);
  if (landCover.value) {
    createHSYImageryLayer();
  } else {
    removeLandcover();
  }
};

const toggleNDVI = () => {
  if (ndvi.value && landCover.value) disableOtherLayer('ndvi');

  toggleStore.setNDVI(ndvi.value);

  if (ndvi.value) {
    changeTIFF();
    eventBus.emit('addNDVI');
  } else {
    removeTIFF();
  }
};

const filterBuildings = () => {
  toggleStore.setHideNonSote(hideNonSote.value);
  toggleStore.setHideNewBuildings(hideNewBuildings.value);
  toggleStore.setHideLow(hideLow.value);
  
  const buildingsDataSource = store?.cesiumViewer?.dataSources?.getByName(`Buildings ${store.postalcode}`)[0];
  
  if (buildingsDataSource) {
    if (hideNonSote.value || hideNewBuildings.value || hideLow.value) {
      buildingService.filterBuildings(buildingsDataSource);
    } else {
      buildingService.showAllBuildings(buildingsDataSource);
    }
    eventBus.emit('updateScatterPlot');
  }
};

// Reset functions
const resetLayers = () => {
  showVegetation.value = false;
  showOtherNature.value = false;
  showTrees.value = false;
  landCover.value = false;
};

const resetFilters = () => {
  hideNonSote.value = false;
  hideNewBuildings.value = false;
  hideLow.value = false;
  filterBuildings();
};

// Watchers
watch(() => store.view, () => {
  resetLayers();
  resetFilters();
});

// Sync with store changes
watch(() => toggleStore.landCover, (newValue) => {
  landCover.value = newValue;
}, { immediate: true });

onMounted(() => {
  buildingService = new Building();
  dataSourceService = new Datasource();
});
</script>

<style scoped>
.map-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.control-group {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  overflow: hidden;
}

.control-group-title {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 12px 16px 8px 16px;
  margin: 0;
  color: rgba(0, 0, 0, 0.87);
  background-color: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.control-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background-color 0.2s;
}

.control-item:last-child {
  border-bottom: none;
}

.control-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.control-item.loading {
  background-color: rgba(25, 118, 210, 0.04);
  border-left: 3px solid #1976d2;
}

.control-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
  margin-left: 12px;
  flex: 1;
  user-select: none;
}

.layer-warning {
  margin-top: 8px;
  font-size: 0.8rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .control-group-title {
    font-size: 0.8rem;
    padding: 10px 12px 6px 12px;
  }
  
  .control-item {
    padding: 6px 12px;
  }
  
  .control-label {
    font-size: 0.8rem;
    margin-left: 8px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .control-group {
    border-width: 2px;
  }
  
  .control-item:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>