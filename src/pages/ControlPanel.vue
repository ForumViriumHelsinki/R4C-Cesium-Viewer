<template>
  <!-- Simplified Analysis Sidebar -->
  <v-navigation-drawer
    role="navigation"
    aria-label="Analysis tools and data exploration"
    class="analysis-sidebar"
    width="280"
    location="right"
  >
    <div class="sidebar-content">
      <!-- Unified Search -->
      <div class="control-section">
        <h3 class="section-subtitle">
          <v-icon class="mr-2">
mdi-magnify
</v-icon>
          Search & Navigate
        </h3>
        <p class="search-description">
          Find locations by address, postal code, or area name
        </p>
        <UnifiedSearch />
      </div>
      
      <!-- Map Controls -->
      <div class="control-section">
        <h3 class="section-subtitle">
          <v-icon class="mr-2">
mdi-layers
</v-icon>
          Map Controls
        </h3>
        <p class="search-description">
          Toggle data layers and apply filters
        </p>
        <MapControls />
      </div>
      
      <!-- Background Maps -->
      <div class="control-section">
        <h3 class="section-subtitle">
          <v-icon class="mr-2">
mdi-map-outline
</v-icon>
          Background Maps
        </h3>
        <BackgroundMapBrowser />
      </div>

      <!-- Analysis Tools -->
      <div class="control-section">
        <h3 class="section-subtitle">
          <v-icon class="mr-2">
mdi-chart-line
</v-icon>
          Analysis Tools
        </h3>
        <div class="analysis-buttons">
          <!-- Postal Code Level Analysis -->
          <template v-if="currentLevel === 'postalCode'">
            <v-btn 
              v-if="heatHistogramData && heatHistogramData.length > 0"
              block 
              variant="outlined" 
              prepend-icon="mdi-chart-histogram"
              class="mb-2"
              @click="openAnalysisPanel('heat-histogram')"
            >
              Heat Distribution
            </v-btn>
            
            <v-btn 
              v-if="showSosEco"
              block 
              variant="outlined" 
              prepend-icon="mdi-account-group"
              class="mb-2"
              @click="openAnalysisPanel('socioeconomics')"
            >
              Socioeconomics
            </v-btn>
            
            <v-btn 
              v-if="currentView !== 'helsinki'"
              block 
              variant="outlined" 
              prepend-icon="mdi-leaf"
              class="mb-2"
              @click="openAnalysisPanel('landcover')"
            >
              Land Cover
            </v-btn>
            
            <v-btn 
              block 
              variant="outlined" 
              prepend-icon="mdi-chart-scatter-plot"
              class="mb-2"
              @click="openAnalysisPanel('scatter-plot')"
            >
              Building Analysis
            </v-btn>
            
            <v-btn 
              v-if="hasNDVIData"
              block 
              variant="outlined" 
              prepend-icon="mdi-leaf"
              class="mb-2"
              @click="openAnalysisPanel('ndvi-analysis')"
            >
              NDVI Vegetation
            </v-btn>
          </template>
          
          <!-- Building Level Analysis -->
          <template v-if="currentLevel === 'building'">
            <v-btn 
              block 
              variant="outlined" 
              prepend-icon="mdi-thermometer"
              class="mb-2"
              @click="openAnalysisPanel('building-heat')"
            >
              Building Heat Data
            </v-btn>
          </template>
          
          <!-- Grid View Specific Tools -->
          <template v-if="currentView === 'grid'">
            <v-btn 
              v-if="statsIndex === 'heat_index'"
              block 
              variant="outlined" 
              prepend-icon="mdi-air-conditioner"
              class="mb-2"
              @click="openAnalysisPanel('cooling-centers')"
            >
              Cooling Centers
            </v-btn>
            
            <v-btn 
              block 
              variant="outlined" 
              prepend-icon="mdi-grid"
              class="mb-2"
              @click="openAnalysisPanel('grid-options')"
            >
              Grid Options
            </v-btn>
          </template>
          
          <!-- No Analysis Available Message -->
          <div
v-if="!hasAvailableAnalysis"
class="no-analysis-message"
>
            <v-icon class="mb-2">
mdi-information-outline
</v-icon>
            <p class="text-body-2 text-center">
              {{ currentLevel === 'start' 
                ? 'Select a postal code area to access analysis tools' 
                : 'No analysis tools available for current selection' }}
            </p>
          </div>
        </div>
      </div>
      
      
      <!-- Properties Display -->
      <div
v-if="currentLevel !== 'start'"
class="control-section"
>
        <h3 class="section-subtitle">
          <v-icon class="mr-2">
mdi-information
</v-icon>
          {{ currentLevel === 'building' ? 'Building Properties' : 'Area Properties' }}
        </h3>
        <PrintBox />
      </div>
    </div>
  </v-navigation-drawer>

  <!-- Analysis Panels (same as before) -->
  <v-dialog 
    v-model="analysisDialog" 
    :width="analysisDialogWidth"
    :height="analysisDialogHeight"
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
{{ currentAnalysisIcon }}
</v-icon>
        {{ currentAnalysisTitle }}
        <v-spacer />
        <v-btn
icon
@click="analysisDialog = false"
>
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="analysis-content">
        <!-- Heat Histogram -->
        <div v-if="currentAnalysis === 'heat-histogram'">
          <HeatHistogram />
        </div>
        
        <!-- Socioeconomics -->
        <div v-if="currentAnalysis === 'socioeconomics'">
          <SocioEconomics />
        </div>
        
        <!-- Land Cover -->
        <div v-if="currentAnalysis === 'landcover'">
          <Landcover />
        </div>
        
        <!-- Scatter Plot -->
        <div v-if="currentAnalysis === 'scatter-plot'">
          <BuildingScatterPlot v-if="currentView !== 'helsinki'" />
          <Scatterplot v-if="currentView === 'helsinki' && scatterPlotEntities" />
        </div>
        
        <!-- Building Heat -->
        <div v-if="currentAnalysis === 'building-heat'">
          <HSYBuildingHeatChart v-if="currentView !== 'helsinki' && currentView !== 'grid'" />
          <BuildingHeatChart v-if="currentView === 'helsinki' && currentView !== 'grid'" />
          <BuildingGridChart v-if="currentView === 'grid'" />
        </div>
        
        <!-- Cooling Centers -->
        <div v-if="currentAnalysis === 'cooling-centers'">
          <div class="cooling-centers-layout">
            <div class="cooling-section">
              <h4 class="subsection-title">
Cooling Centers
</h4>
              <CoolingCenter />
            </div>
            <div class="cooling-section">
              <h4 class="subsection-title">
Optimizer
</h4>
              <CoolingCenterOptimiser />
            </div>
          </div>
          <div class="mt-4">
            <h4 class="subsection-title">
Impact Estimates
</h4>
            <EstimatedImpacts />
          </div>
          <div class="mt-4">
            <h4 class="subsection-title">
Green & Blue Infrastructure
</h4>
            <LandcoverToParks />
          </div>
        </div>
        
        <!-- Grid Options -->
        <div v-if="currentAnalysis === 'grid-options'">
          <StatisticalGridOptions />
        </div>
        
        <!-- NDVI Analysis -->
        <div v-if="currentAnalysis === 'ndvi-analysis'">
          <PostalCodeNDVI />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed } from 'vue';
import HeatHistogram from '../components/HeatHistogram.vue';
import SocioEconomics from '../views/SocioEconomics.vue';
import Landcover from '../views/Landcover.vue';
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue';
import Scatterplot from '../components/Scatterplot.vue';
import HSYBuildingHeatChart from '../components/HSYBuildingHeatChart.vue';
import BuildingHeatChart from '../components/BuildingHeatChart.vue';
import BuildingGridChart from '../components/BuildingGridChart.vue';
import PrintBox from '../components/PrintBox.vue';
import { useGlobalStore } from '../stores/globalStore';
import { usePropsStore } from '../stores/propsStore';
import { useHeatExposureStore } from '../stores/heatExposureStore';
import { useSocioEconomicsStore } from '../stores/socioEconomicsStore';
import { useToggleStore } from '../stores/toggleStore';
import Tree from '../services/tree';
import Featurepicker from '../services/featurepicker';
import Camera from '../services/camera';
import { storeToRefs } from 'pinia';
import UnifiedSearch from '../components/UnifiedSearch.vue';
import StatisticalGridOptions from '../components/StatisticalGridOptions.vue';
import BackgroundMapBrowser from '../components/BackgroundMapBrowser.vue';
import MapControls from '../components/MapControls.vue';
import DataSourceStatus from '../components/DataSourceStatus.vue';
import CoolingCenter from '../components/CoolingCenter.vue';
import LandcoverToParks from '../components/LandcoverToParks.vue';
import CoolingCenterOptimiser from '../components/CoolingCenterOptimiser.vue';
import EstimatedImpacts from '../components/EstimatedImpacts.vue';
import PostalCodeNDVI from '../views/PostalCodeNDVI.vue';

export default {
  components: {
    HeatHistogram,
    SocioEconomics,
    Landcover,
    BuildingScatterPlot,
    PrintBox,
    HSYBuildingHeatChart,
    UnifiedSearch,
    Scatterplot,
    BuildingHeatChart,
    BuildingGridChart,
    StatisticalGridOptions,
    BackgroundMapBrowser,
    MapControls,
    DataSourceStatus,
    CoolingCenter,
    CoolingCenterOptimiser,
    EstimatedImpacts,
    PostalCodeNDVI,
    LandcoverToParks,
  },
  setup() {
    const globalStore = useGlobalStore();
    const propsStore = usePropsStore();
    const heatExposureStore = useHeatExposureStore();
    const socioEconomicsStore = useSocioEconomicsStore();
    const toggleStore = useToggleStore();
    
    const currentLevel = computed(() => globalStore.level);
    const currentView = computed(() => globalStore.view);
    const { ndvi } = storeToRefs(toggleStore);
    
    // Analysis dialog state
    const analysisDialog = ref(false);
    const currentAnalysis = ref('');

    const heatHistogramData = computed(() => propsStore.heatHistogramData);
    const statsIndex = computed(() => propsStore.statsIndex);
    const scatterPlotEntities = computed(() => propsStore.scatterPlotEntities);
    const showSosEco = computed(
      () => socioEconomicsStore.data && heatExposureStore.data
    );
    
    // Check if NDVI data is available (when NDVI layer is enabled)
    const hasNDVIData = computed(() => toggleStore.ndvi);

    // Check if any analysis tools are available
    const hasAvailableAnalysis = computed(() => {
      if (currentLevel.value === 'start') return false;
      
      if (currentLevel.value === 'postalCode' && currentView.value !== 'grid') {

        return (heatHistogramData.value && heatHistogramData.value.length > 0) ||
               showSosEco.value ||
               (currentView.value !== 'helsinki') ||
               true; // Building analysis is always available at postal level
      }
      
      if (currentLevel.value === 'building') {
        return true; // Building heat data is always available
      }
      
      if (currentView.value === 'grid') {
        return true; // Grid options are always available in grid view
      }
      
      return false;
    });

    // Analysis panel configuration
    const analysisConfig = {
      'heat-histogram': {
        title: 'Heat Distribution Analysis',
        icon: 'mdi-chart-histogram',
        width: '800px',
        height: '600px'
      },
      'socioeconomics': {
        title: 'Socioeconomic Analysis',
        icon: 'mdi-account-group',
        width: '900px',
        height: '700px'
      },
      'landcover': {
        title: 'Land Cover Analysis',
        icon: 'mdi-leaf',
        width: '800px',
        height: '600px'
      },
      'scatter-plot': {
        title: 'Building Analysis',
        icon: 'mdi-chart-scatter-plot',
        width: '1000px',
        height: '700px'
      },
      'building-heat': {
        title: 'Building Heat Data',
        icon: 'mdi-thermometer',
        width: '800px',
        height: '600px'
      },
      'cooling-centers': {
        title: 'Cooling Center Management',
        icon: 'mdi-air-conditioner',
        width: '1000px',
        height: '800px'
      },
      'grid-options': {
        title: 'Statistical Grid Options',
        icon: 'mdi-grid',
        width: '600px',
        height: '500px'
      },
      'ndvi-analysis': {
        title: 'NDVI Vegetation Analysis',
        icon: 'mdi-leaf',
        width: '900px',
        height: '600px'
      }
    };

    const currentAnalysisTitle = computed(() => {
      return analysisConfig[currentAnalysis.value]?.title || '';
    });

    const currentAnalysisIcon = computed(() => {
      return analysisConfig[currentAnalysis.value]?.icon || 'mdi-chart-line';
    });

    const analysisDialogWidth = computed(() => {
      return analysisConfig[currentAnalysis.value]?.width || '800px';
    });

    const analysisDialogHeight = computed(() => {
      return analysisConfig[currentAnalysis.value]?.height || '600px';
    });

    const openAnalysisPanel = (analysisType) => {
      currentAnalysis.value = analysisType;
      analysisDialog.value = true;
    };

    // Data source event handlers
    const handleSourceRetry = (sourceId) => {
      console.log(`Retrying data source: ${sourceId}`);
    };

    const handleCacheCleared = (sourceId) => {
      console.log(`Cache cleared for: ${sourceId}`);
    };

    const handleDataPreload = (sourceId) => {
      console.log(`Preloading requested for: ${sourceId}`);
    };

    // Reset application function
    const reset = () => {
      location.reload();
    };
      
    // Rotate camera function
    const rotateCamera = () => {
      const camera = new Camera();
      camera.rotateCamera();
    };

    // Return to postal code level function
    const returnToPostalCode = () => {
      const featurepicker = new Featurepicker();
      const treeService = new Tree();
      hideTooltip();
      featurepicker.loadPostalCode();
      toggleStore.showTrees && treeService.loadTrees();
    };

    // Function to hide the tooltip
    const hideTooltip = () => {
      const tooltip = document.querySelector('.tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    };

    return {
      analysisDialog,
      currentAnalysis,
      currentAnalysisTitle,
      currentAnalysisIcon,
      analysisDialogWidth,
      analysisDialogHeight,
      openAnalysisPanel,
      currentLevel,
      currentView,
      heatHistogramData,
      scatterPlotEntities,
      showSosEco,
      statsIndex,
      hasAvailableAnalysis,
      hasNDVIData,
      handleSourceRetry,
      handleCacheCleared,
      handleDataPreload,
      reset,
      rotateCamera,
      returnToPostalCode,
      ndvi,
    };
  },
};
</script>

<style scoped>
.analysis-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.control-section {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.control-section:last-child {
  border-bottom: none;
}

.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.87);
  display: flex;
  align-items: center;
}

.subsection-title {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.7);
}

.subsection {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  border-left: 3px solid rgba(25, 118, 210, 0.3);
}

.subsection:last-child {
  margin-bottom: 0;
}


.analysis-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.no-analysis-message {
  text-align: center;
  padding: 16px;
  color: rgba(0, 0, 0, 0.6);
}

.analysis-content {
  padding: 24px;
}

.cooling-centers-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.cooling-section {
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.02);
}

.v-btn:focus {
  outline: 2px solid #1976d2;
  outline-offset: 2px;
}

.mb-2 {
  margin-bottom: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.search-description {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
  margin-top: -4px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .cooling-centers-layout {
    grid-template-columns: 1fr;
  }
  
  .control-section {
    padding: 12px;
  }
  
  .analysis-content {
    padding: 16px;
  }
}

/* Dialog responsive sizing */
@media (max-width: 1200px) {
  .v-dialog .v-card {
    width: 95vw !important;
    height: 90vh !important;
    max-width: none !important;
    max-height: none !important;
  }
}
</style>