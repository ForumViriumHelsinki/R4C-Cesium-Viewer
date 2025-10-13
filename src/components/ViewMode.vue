<template>
  <div class="view-mode-selector">
    <div class="view-mode-cards">
      <!-- Capital Region Heat View -->
      <div
        class="view-mode-card"
        :class="{ 'active': activeViewMode === 'capitalRegionView' }"
        @click="onToggleChange('capitalRegionView')"
      >
        <div class="card-header">
          <v-icon
class="mode-icon"
:color="activeViewMode === 'capitalRegionView' ? 'primary' : 'grey'"
>
            mdi-city
          </v-icon>
          <h4 class="mode-title">
Capital Region
</h4>
          <v-icon
v-if="activeViewMode === 'capitalRegionView'"
class="check-icon"
color="primary"
>
            mdi-check-circle
          </v-icon>
        </div>

        <p class="mode-description">
          Explore urban heat patterns across the entire Helsinki metropolitan area (~200 postal codes)
        </p>

        <div class="mode-features">
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-thermometer
</v-icon>
            Heat Analysis
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-home-group
</v-icon>
            Building Data
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-leaf
</v-icon>
            Green Coverage
          </v-chip>
        </div>
      </div>

      <!-- Statistical Grid View -->
      <div
        class="view-mode-card"
        :class="{ 'active': activeViewMode === 'gridView' }"
        @click="onToggleChange('gridView')"
      >
        <div class="card-header">
          <v-icon
class="mode-icon"
:color="activeViewMode === 'gridView' ? 'primary' : 'grey'"
>
            mdi-grid
          </v-icon>
          <h4 class="mode-title">
Statistical Grid
</h4>
          <v-icon
v-if="activeViewMode === 'gridView'"
class="check-icon"
color="primary"
>
            mdi-check-circle
          </v-icon>
        </div>

        <p class="mode-description">
          Analyze data using standardized 250m × 250m statistical grid cells for precise spatial analysis
        </p>

        <div class="mode-features">
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-chart-box
</v-icon>
            Grid Analysis
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-air-conditioner
</v-icon>
            Cooling Centers
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-chart-line
</v-icon>
            Statistics
          </v-chip>
        </div>
      </div>

      <!-- Helsinki Heat View (conditionally shown) -->
      <div
        v-if="showHelsinkiHeat"
        class="view-mode-card"
        :class="{ 'active': activeViewMode === 'helsinkiHeat' }"
        @click="onToggleChange('helsinkiHeat')"
      >
        <div class="card-header">
          <v-icon
class="mode-icon"
:color="activeViewMode === 'helsinkiHeat' ? 'primary' : 'grey'"
>
            mdi-city-variant
          </v-icon>
          <h4 class="mode-title">
Helsinki Focus
</h4>
          <v-icon
v-if="activeViewMode === 'helsinkiHeat'"
class="check-icon"
color="primary"
>
            mdi-check-circle
          </v-icon>
        </div>

        <p class="mode-description">
          Detailed analysis focused on Helsinki city with enhanced vegetation and social infrastructure data
        </p>

        <div class="mode-features">
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-tree
</v-icon>
            Vegetation
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-hospital-building
</v-icon>
            Social Services
          </v-chip>
          <v-chip
size="x-small"
class="feature-chip"
>
            <v-icon
start
size="12"
>
mdi-account-group
</v-icon>
            Demographics
          </v-chip>
        </div>
      </div>
    </div>

    <!-- Current View Info -->
    <div class="current-view-info">
      <div class="info-section">
        <v-icon
class="info-icon"
size="16"
color="primary"
>
mdi-information
</v-icon>
        <span class="info-text">{{ currentViewInfo }}</span>
      </div>

      <div class="coverage-info">
        <v-chip
          size="small"
          :color="getViewModeColor()"
          variant="tonal"
        >
          {{ getCoverageText() }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Datasource from '../services/datasource.js';
import { removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import FeaturePicker from '../services/featurepicker';

export default {
  name: 'ViewMode',
  setup() {
    const activeViewMode = ref('capitalRegionView'); // Default view mode
    const toggleStore = useToggleStore();
    const store = useGlobalStore();
    const dataSourceService = new Datasource();
    const featurePicker = new FeaturePicker();

    // View mode information
    const viewModeInfo = {
      capitalRegionView: {
        description: 'Analyzing urban heat across the entire Helsinki metropolitan area',
        coverage: '~200 postal codes',
        color: 'blue'
      },
      gridView: {
        description: 'Using 250m statistical grid for precise spatial analysis',
        coverage: 'Grid-based analysis',
        color: 'green'
      },
      helsinkiHeat: {
        description: 'Focused analysis on Helsinki with enhanced vegetation data',
        coverage: '~50 Helsinki postal codes',
        color: 'orange'
      }
    };

    const currentViewInfo = computed(() => {
      return viewModeInfo[activeViewMode.value]?.description || '';
    });

    const getCoverageText = () => {
      return viewModeInfo[activeViewMode.value]?.coverage || '';
    };

    const getViewModeColor = () => {
      return viewModeInfo[activeViewMode.value]?.color || 'grey';
    };

    // Watcher for activeViewMode changes
    watch(activeViewMode, (newViewMode) => {
      onToggleChange(newViewMode);
    });

    const onToggleChange = (viewMode) => {
      activeViewMode.value = viewMode;

      switch (viewMode) {
        case 'capitalRegionView':
          capitalRegion();
          break;
        case 'gridView':
          gridView();
          break;
        case 'capitalRegionCold':
          toggleCold();
          break;
        case 'helsinkiHeat':
          helsinkiHeat();
          break;
        default:
          break;
      }
    };

    const toggleCold = async () => {
      const checked = activeViewMode.value === 'capitalRegionCold';
      toggleStore.setCapitalRegionCold(checked);
      setCapitalRegion();
    };

    const setCapitalRegion = async () => {
      store.setView('capitalRegion');
      toggleStore.setHelsinkiView(false);
      store.level === 'start' && toggleStore.reset() && await clearLandCover();
      await dataSourceService.removeDataSourcesAndEntities();
      await dataSourceService.loadGeoJsonDataSource(
        0.2,
        './assets/data/hsy_po.json',
        'PostCodes'
      );

      store.postalcode && featurePicker.loadPostalCode();
      toggleStore.showTrees && await loadTrees();
    };

    const loadTrees = async () => {
      const treeService = new Tree();
      treeService.loadTrees();
    };

    const clearLandCover = async () => {
      removeLandcover(store.landcoverLayers);
    };

    const capitalRegion = async () => {
      const checked = activeViewMode.value === 'capitalRegionView';
      toggleStore.setCapitalRegionCold(!checked);
      setCapitalRegion();
    };

    const helsinkiHeat = async () => {
      const checked = activeViewMode.value === 'helsinkiHeat';
      toggleStore.reset();
      toggleStore.setHelsinkiView(checked);
      toggleStore.setCapitalRegionCold(false);
      store.setView('helsinki');
      await dataSourceService.removeDataSourcesAndEntities();
      await dataSourceService.loadGeoJsonDataSource(
        0.2,
        './assets/data/hki_po_clipped.json',
        'PostCodes'
      );

      store.postalcode && featurePicker.loadPostalCode();
    };

    const gridView = () => {
      const isGridView = activeViewMode.value === 'gridView';
      toggleStore.setGridView(isGridView);
      toggleStore.setHelsinkiView(false);
      store.setView(isGridView ? 'grid' : 'capitalRegion');
      if (isGridView) {
        store.setShowBuildingInfo(false);
        toggleStore.setGrid250m(true);
      } else {
        reset();
      }
    };

    const reset = () => {
      // Reset logic if needed
    };

    // Computed property to control the visibility of the Helsinki Heat option
    const showHelsinkiHeat = computed(() => {
      const postalCode = Number(store.postalcode);
      return postalCode === null || (postalCode >= 0 && postalCode <= 1000);
    });

    return {
      activeViewMode,
      onToggleChange,
      showHelsinkiHeat,
      currentViewInfo,
      getCoverageText,
      getViewModeColor,
    };
  },
};
</script>

<style scoped>
.view-mode-selector {
  width: 100%;
}

.view-mode-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.view-mode-card {
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.view-mode-card:hover {
  border-color: rgba(25, 118, 210, 0.5);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.view-mode-card.active {
  border-color: #1976d2;
  background: rgba(25, 118, 210, 0.02);
  box-shadow: 0 2px 12px rgba(25, 118, 210, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.mode-icon {
  font-size: 20px;
}

.mode-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
  color: rgba(0, 0, 0, 0.87);
}

.check-icon {
  font-size: 18px;
}

.mode-description {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0 0 12px 0;
  line-height: 1.3;
}

.mode-features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.feature-chip {
  background-color: rgba(0, 0, 0, 0.06);
  font-size: 0.75rem;
}

.current-view-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: rgba(25, 118, 210, 0.04);
  border-radius: 6px;
  border-left: 3px solid #1976d2;
}

.info-section {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-text {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
}

.coverage-info {
  display: flex;
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .view-mode-card {
    padding: 12px;
  }

  .mode-title {
    font-size: 0.9rem;
  }

  .mode-description {
    font-size: 0.8rem;
  }

  .mode-features {
    gap: 2px;
  }

  .feature-chip {
    font-size: 0.7rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .view-mode-card {
    border-width: 3px;
  }

  .view-mode-card.active {
    background: rgba(25, 118, 210, 0.1);
  }
}

/* Animation for smooth transitions */
.view-mode-card {
  transform: scale(1);
}

.view-mode-card:active {
  transform: scale(0.98);
}

.view-mode-card.active {
  transform: scale(1.02);
}

@media (prefers-reduced-motion: reduce) {
  .view-mode-card {
    transition: none;
    transform: none;
  }

  .view-mode-card:active,
  .view-mode-card.active {
    transform: none;
  }
}
</style>
