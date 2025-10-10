<template>
  <div class="view-mode-compact">
    <!-- View Mode Button Group -->
    <v-btn-toggle
      v-model="activeViewMode"
      mandatory
      variant="outlined"
      density="compact"
      class="view-toggle-group"
    >
      <v-btn
        value="capitalRegionView"
        size="small"
        @click="onToggleChange('capitalRegionView')"
      >
        <v-icon
start
size="16"
>
mdi-city
</v-icon>
        Capital Region
      </v-btn>

      <v-btn
        value="gridView"
        size="small"
        @click="onToggleChange('gridView')"
      >
        <v-icon
start
size="16"
>
mdi-grid
</v-icon>
        Statistical Grid
      </v-btn>

    </v-btn-toggle>

    <!-- Contextual Info Chip -->
    <v-chip
      size="small"
      :color="getViewModeColor()"
      variant="tonal"
      class="coverage-chip"
    >
      {{ getCoverageText() }}
    </v-chip>
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
  name: 'ViewModeCompact',
  setup() {
    const activeViewMode = ref('capitalRegionView');
    const toggleStore = useToggleStore();
    const store = useGlobalStore();
    const dataSourceService = new Datasource();
    const featurePicker = new FeaturePicker();

    // View mode information
    const viewModeInfo = {
      capitalRegionView: {
        coverage: '~200 postal codes',
        color: 'blue'
      },
      gridView: {
        coverage: 'Grid analysis',
        color: 'green'
      },
      helsinkiHeat: {
        coverage: '~50 Helsinki areas',
        color: 'orange'
      }
    };

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
      getCoverageText,
      getViewModeColor,
    };
  },
};
</script>

<style scoped>
.view-mode-compact {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle-group {
  border-radius: 6px;
}

.coverage-chip {
  font-size: 0.75rem;
  height: 24px;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .view-mode-compact {
    flex-direction: column;
    gap: 6px;
  }

  .view-toggle-group :deep(.v-btn) {
    font-size: 0.75rem;
    padding: 0 8px;
  }

  .view-toggle-group :deep(.v-btn .v-icon) {
    font-size: 14px;
  }
}

@media (max-width: 600px) {
  .view-toggle-group :deep(.v-btn) {
    min-width: 0;
    padding: 0 6px;
  }

  .view-toggle-group :deep(.v-btn .mdi-city::before) {
    content: '🏙️';
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }

  .view-toggle-group :deep(.v-btn .mdi-grid::before) {
    content: '📊';
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }

  .view-toggle-group :deep(.v-btn .mdi-city-variant::before) {
    content: '🌆';
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
  }
}
</style>
