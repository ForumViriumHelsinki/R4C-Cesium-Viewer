<template>
  <v-container class="landcover-to-parks">
    <v-card
      elevation="2"
      class="pa-4"
    >
      <v-card-title>Create Parks</v-card-title>
      <v-card-text>
        <p class="text-caption mb-4">
          Grid cells are colored by heat index (Blue = Cool, Red = Hot). Select a cell to load convertible landcover areas.
        </p>

        <v-row class="mt-2">
          <v-col cols="6">
            <v-btn
              color="primary"
              :loading="isLoading"
              :class="{ 'active-btn': isSelectingGrid }"
              block
              @click="handlePrimaryButtonClick"
            >
              {{ primaryButtonText }}
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              color="error"
              block
              @click="resetLandcover"
            >
              Reset
            </v-btn>
          </v-col>
        </v-row>

        <div
          v-if="calculationResults"
          class="mt-4"
        >
          <v-divider class="mb-3" />
          <p class="text-subtitle-2">
            Estimated Impact
          </p>
          <v-table
            density="compact"
            class="mt-2"
          >
            <tbody>
              <tr>
                <td>Area Converted</td>
                <td>{{ calculationResults.area }} ha</td>
              </tr>
              <tr>
                <td>Heat Index Reduction</td>
                <td class="font-weight-bold text-green">
                  -{{ calculationResults.reduction }}
                </td>
              </tr>
              <tr>
                <td>Original Index</td>
                <td>{{ calculationResults.original }}</td>
              </tr>
              <tr>
                <td>New Index</td>
                <td class="font-weight-bold">
                  {{ calculationResults.new }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useGridStyling } from '../composables/useGridStyling.js';
import { useURLStore } from '../stores/urlStore.js';
import * as Cesium from 'cesium';

// --- STATE MANAGEMENT ---
const globalStore = useGlobalStore();
const propsStore = usePropsStore(); 
const urlStore = useURLStore();
const viewer = computed(() => globalStore.cesiumViewer);
const statsIndex = computed(() => propsStore.statsIndex);

// ** Instantiate the composable to get the restore function **
const { updateGridColors: restoreGridColoring } = useGridStyling();

const isSelectingGrid = ref(false);
const isLoading = ref(false);
const dataSourceName = 'landcover_for_parks';
const gridDataSourceName = '250m_grid';

const selectedGridEntity = ref(null);
const originalGridColor = ref(null);
const landcoverFeaturesLoaded = ref(false);
const loadedGeoJson = ref(null);
const loadedLandcoverDataSource = ref(null);
const calculationResults = ref(null);

// --- DYNAMIC UI ---
const primaryButtonText = computed(() => {
  if (landcoverFeaturesLoaded.value) return "Turn to Parks";
  if (isSelectingGrid.value) return "...";
  return "Select";
});

const handlePrimaryButtonClick = () => {
  if (landcoverFeaturesLoaded.value) {
    turnToParks();
  } else {
    toggleSelectionMode();
  }
};

// --- UI ACTIONS ---
const toggleSelectionMode = () => {
  isSelectingGrid.value = !isSelectingGrid.value;
  if (!isSelectingGrid.value) isLoading.value = false;
};

const resetLandcover = async () => {
  isLoading.value = false;
  isSelectingGrid.value = false;
  
  if (loadedLandcoverDataSource.value) {
    viewer.value.dataSources.remove(loadedLandcoverDataSource.value, true);
  }
  
  const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
  if (selectedGridEntity.value && originalGridColor.value && gridDataSource) {
    gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities);
    selectedGridEntity.value.polygon.material = originalGridColor.value;
    gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities);
  }

  selectedGridEntity.value = null;
  originalGridColor.value = null;
  landcoverFeaturesLoaded.value = false;
  loadedLandcoverDataSource.value = null;
  loadedGeoJson.value = null;
  calculationResults.value = null;
};

// --- CORE LOGIC ---
const handleMapClick = async (clickEvent) => {
  if (!isSelectingGrid.value) return;

  const scene = viewer.value.scene;
  const pickedObject = scene.pick(clickEvent.position);

  if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
    const gridId = pickedObject.id.properties.grid_id?.getValue();
    const clickedEntity = pickedObject.id;
    const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
    
    if (gridId && clickedEntity.polygon && gridDataSource) {
      await resetLandcover();
      isLoading.value = true;
      isSelectingGrid.value = false;
      
      gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities);
      
      selectedGridEntity.value = clickedEntity;
      originalGridColor.value = clickedEntity.polygon.material;
      clickedEntity.polygon.material = Cesium.Color.WHITE.withAlpha(0.75);

      gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities);

      await loadLandcoverData(gridId);
      isLoading.value = false;
    }
  }
};

const getHeatColor = (value) => {
  let r, g, b;
  const alpha = 0.65;
  if (value < 0.5) {
    const interp = value * 2;
    r = interp; g = interp; b = 1.0;
  } else {
    const interp = (value - 0.5) * 2;
    r = 1.0; g = 1.0 - interp; b = 1.0 - interp;
  }
  return new Cesium.Color(r, g, b, alpha);
};

const applyDynamicStyling = (dataSource) => {
  const entities = dataSource.entities.values;
  for (const entity of entities) {
    if (!entity.polygon) continue;
    const koodi = entity.properties.koodi?.getValue();
    let color;
    if (koodi === '130') {
      color = Cesium.Color.fromCssColorString('#857976');
    } else if (koodi === '410') {
      color = Cesium.Color.fromCssColorString('#cd853f');
    } else {
      color = Cesium.Color.LIGHTSLATEGRAY;
    }
    entity.polygon.material = color.withAlpha(0.7);
  }
};

const loadLandcoverData = async (gridId) => {
  const apiUrl = urlStore.landcoverToParks( gridId );
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const geojsonData = await response.json();

    if (geojsonData.features.length === 0) {
      alert(`No convertible landcover features found for the selected grid cell.`);
      if (selectedGridEntity.value && originalGridColor.value) {
          selectedGridEntity.value.polygon.material = originalGridColor.value;
      }
      return;
    }
    
    loadedGeoJson.value = geojsonData;

    const defaultStyle = { stroke: Cesium.Color.BLACK.withAlpha(0.5), strokeWidth: 1 };
    const newDataSource = await Cesium.GeoJsonDataSource.load(geojsonData, defaultStyle);
    newDataSource.name = dataSourceName;
    await viewer.value.dataSources.add(newDataSource);
    applyDynamicStyling(newDataSource);
    
    loadedLandcoverDataSource.value = newDataSource;
    landcoverFeaturesLoaded.value = true;

  } catch (error) {
    console.error("Failed to load landcover data:", error);
    alert("An error occurred while fetching landcover data.");
  }
};

const filterGridEntities = () => {
  const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
  if (!gridDataSource) return;
  for (const entity of gridDataSource.entities.values) {
    if (entity.properties && entity.properties['final_avg_conditional']?.getValue()) {
      entity.show = true;
      const heatIndex = entity.properties['final_avg_conditional'].getValue();
      if (entity.polygon) {
        entity.polygon.material = getHeatColor(heatIndex);
      }
    } else {
      entity.show = false;
    }
  }
};

const turnToParks = () => {
  if (!loadedGeoJson.value || !selectedGridEntity.value) return;

  const totalAreaConverted = loadedGeoJson.value.features.reduce((sum, feature) => {
    return sum + (feature.properties.area_m2 || 0);
  }, 0);

  const gridCellTotalArea = 250 * 250;
  const maxReduction = 0.177;
  const proportionConverted = totalAreaConverted / gridCellTotalArea;
  const actualReduction = proportionConverted * maxReduction;

  const originalIndex = selectedGridEntity.value.properties.final_avg_conditional.getValue();
  const newIndex = Math.max(0, originalIndex - actualReduction);

  const newColor = getHeatColor(newIndex);
  const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
  if (gridDataSource) {
      gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities);
      selectedGridEntity.value.polygon.material = newColor;
      originalGridColor.value = newColor; 
      gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities);
  }

  if (loadedLandcoverDataSource.value) {
    for (const entity of loadedLandcoverDataSource.value.entities.values) {
        if (entity.polygon) {
            entity.polygon.material = Cesium.Color.FORESTGREEN.withAlpha(0.8);
        }
    }
  }

  calculationResults.value = {
    area: (totalAreaConverted / 10000).toFixed(2), 
    reduction: actualReduction.toFixed(3),
    original: originalIndex.toFixed(3),
    new: newIndex.toFixed(3)
  };

  landcoverFeaturesLoaded.value = false;
};

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  if (!viewer.value) {
    console.error("Cesium viewer is not initialized.");
    return;
  }
  
  viewer.value.screenSpaceEventHandler.setInputAction(handleMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  
  const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
  if (gridDataSource) {
    if (gridDataSource.entities.values.length > 0) {
      filterGridEntities();
    }
    gridDataSource.entities.collectionChanged.addEventListener(filterGridEntities);
  } else {
    console.warn(`Datasource '${gridDataSourceName}' not found on mount.`);
  }
});

onUnmounted(() => {
  if (viewer.value && !viewer.value.isDestroyed()) {
    viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    resetLandcover();
    
    const gridDataSource = viewer.value.dataSources.getByName(gridDataSourceName)[0];
    if (gridDataSource) {
      gridDataSource.entities.collectionChanged.removeEventListener(filterGridEntities);
      restoreGridColoring(statsIndex.value);
    }
  }
});
</script>

<style scoped>
.landcover-to-parks {
  padding: 0;
  margin: 0;
}
.active-btn {
  background-color: #ffca28 !important;
  color: black !important;
}
.text-caption {
  line-height: 1.2;
}
</style>