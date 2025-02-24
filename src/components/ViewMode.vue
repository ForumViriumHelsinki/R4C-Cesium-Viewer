<template>
  <div id="viewModeContainer">
    <div id="viewModeToggleContainer">
      <label class="radio-label">
        <input 
          v-model="activeViewMode" 
          type="radio" 
          value="capitalRegionView" 
          @change="onToggleChange('capitalRegionView')" 
        >
        Capital Region Heat
      </label>    

      <label class="radio-label">
        <input 
          v-model="activeViewMode" 
          type="radio" 
          value="gridView" 
          @change="onToggleChange('gridView')" 
        >
        Statistical Grid
      </label>
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
  setup() {
    const activeViewMode = ref('capitalRegionView'); // Default view mode
    const toggleStore = useToggleStore();
    const store = useGlobalStore(); 
    const dataSourceService = new Datasource();
    const featurePicker = new FeaturePicker();

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
      treeService.loadTrees( );
    };

    const clearLandCover = async () => {
      removeLandcover( store.landcoverLayers );
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
        store.setShowBuildingInfo( false );
		    toggleStore.setGrid250m( true );
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
      showHelsinkiHeat, // Add this to expose the computed property to the template
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
