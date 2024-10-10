<template>
  <div id="viewModeContainer">
    <div id="viewModeToggleContainer">
      <label class="radio-label">
        <input 
          type="radio" 
          v-model="activeViewMode" 
          value="capitalRegionView" 
          @change="onToggleChange('capitalRegionView')" 
        />
        Capital Region Heat
      </label>
      <label class="radio-label">
        <input 
          type="radio" 
          v-model="activeViewMode" 
          value="helsinkiHeat" 
          @change="onToggleChange('helsinkiHeat')" 
        />
        Helsinki Heat
      </label>      
      <label class="radio-label">
        <input 
          type="radio" 
          v-model="activeViewMode" 
          value="gridView" 
          @change="onToggleChange('gridView')" 
        />
        Statistical Grid
      </label>
      <label class="radio-label">
        <input 
          type="radio" 
          v-model="activeViewMode" 
          value="capitalRegionCold" 
          @change="onToggleChange('capitalRegionCold')" 
        />
        Capital Region Cold
      </label>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Datasource from '../services/datasource.js';
import { eventBus } from '../services/eventEmitter.js';

export default {
  setup() {
    const activeViewMode = ref('capitalRegionView'); // Default view mode
    const toggleStore = useToggleStore();
    const store = useGlobalStore(); 
    const dataSourceService = new Datasource();

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
        // Additional cases if necessary
        default:
          break;
      }
    };

    const toggleCold = () => {
      const checked = activeViewMode.value === 'capitalRegionCold';
      toggleStore.setCapitalRegionCold(checked);
      if (!checked) reset();
    };

    const capitalRegion = async () => {
        store.setView('capitalRegion');
        reset();
      
    };

    const helsinkiHeat = async () => {
        toggleStore.setHelsinkiView( true );
        store.setView( 'helsinki' );
        dataSourceService.removeDataSourcesByNamePrefix('PostCodes');
        await dataSourceService.loadGeoJsonDataSource(
            0.2,
            './assets/data/hki_po_clipped.json',
            'PostCodes'
        );

    };

    const gridView = () => {
      const isGridView = activeViewMode.value === 'gridView';
      toggleStore.setGridView(isGridView);
      store.setView(isGridView ? 'grid' : 'capitalRegion');
      if (isGridView) {
        eventBus.emit('createPopulationGrid');
      } else {
        reset();
      }
    };

    const reset = () => {
      // Reset logic if needed
    };

    return {
      activeViewMode,
      onToggleChange,
    };
  },
};
</script>

<style scoped>
#viewModeContainer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

#viewModeToggleContainer {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 1rem;
}

.radio-label {
  display: inline-block;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px; /* Change this to adjust font size */
}

input[type="radio"] {
  margin-right: 5px;
}
</style>
