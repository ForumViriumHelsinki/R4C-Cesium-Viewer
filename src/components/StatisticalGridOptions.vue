<template>
  <div
    v-if="legendData.length > 0 && legendVisible"
    id="legend"
  >
    <div v-if="legendExpanded">
      <h3>Statistical grid options</h3>
      <div
        v-if="localSelectedIndex === 'avgheatexposure' || localSelectedIndex === 'combined_avgheatexposure'"
        class="gradient-legend"
      >
        <div class="gradient-bar" />
        <div class="gradient-labels">
          <span>0.1</span>
          <span>0.2</span>
          <span>0.3</span>
          <span>0.4</span>
          <span>0.5</span>
          <span>0.6</span>
          <span>0.7</span>
          <span>0.8</span>
          <span>0.9</span>
        </div>
      </div>

      <div
        v-else-if="localSelectedIndex === 'combined_heat_flood_green'"
        class="striped-legend"
      >
        <div class="legend-container">
          <div class="combined-legend">
            <div class="legend-section">
              <div class="heat-legend">
                <h5>Heat Index</h5>
                <div
                  v-for="item in indexToColorScheme.partialHeat"
                  :key="item.range"
                  class="swatch"
                >
                  <div
                    class="color-box"
                    :style="{ backgroundColor: item.color }"
                  />
                  <span>{{ item.range }}</span>
                </div>
              </div>
              <div class="flood-legend">
                <h5>Flood Index</h5>
                <div
                  v-for="item in indexToColorScheme.partialFlood"
                  :key="item.range"
                  class="swatch"
                >
                  <div
                    class="color-box"
                    :style="{ backgroundColor: item.color }"
                  />
                  <span>{{ item.range }}</span>
                </div>
              </div>
              <div class="missing-legend">
                <h5>Incomplete Data</h5>
                <div
                  v-for="item in indexToColorScheme.both"
                  :key="item.range"
                  class="swatch"
                >
                  <div
                    class="color-box"
                    :style="{ backgroundColor: item.color }"
                  />
                  <span>{{ item.range }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="extrusion-note">
          <span>Green Space Index shown by grid cell height visualisation, with a maximum height of 250m (least green).</span>
        </div>
      </div>

      <div v-else>
        <div
          v-for="item in legendData"
          :key="item.range"
          class="swatch"
        >
          <div
            class="color-box"
            :style="{ backgroundColor: item.color }"
          />
          <span>{{ item.range }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="legendExpanded && extrusionNote"
      class="extrusion-note"
    >
      <span>{{ extrusionNote }}</span>
    </div>

    <v-tooltip
      v-if="selectedIndexDescription && legendExpanded"
      :text="selectedIndexDescription"
      location="bottom"
    >
      <template #activator="{ props }">
        <v-select
          v-bind="props"
          v-model="localSelectedIndex"
          :items="indexOptions"
          item-title="text"
          item-value="value"
          label="Select Index"
          style="max-width: 300px;"
          :menu-props="{ zIndex: 100000 }"
          @update:model-value="handleSelectionChange"
          @click.stop
        />
      </template>
    </v-tooltip>

    <div
      v-if="legendExpanded"
      class="source-note"
    >
      Socioeconomic source data by<br>
      <a
        href="https://stat.fi/index_en.html"
        target="_blank"
      >Statistics Finland</a><br>
      <a
        href="https://www.hsy.fi/globalassets/ilmanlaatu-ja-ilmasto/tiedostot/social-vulnerability-to-climate-change-helsinki-metropolitan-area_2016.pdf"
        target="_blank"
      >Methodology for Assessing Social Vulnerability</a>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { usePropsStore } from '../stores/propsStore.js';
import { useIndexData } from '../composables/useIndexData.js';
import { indexToColorScheme } from '../composables/useGridStyling.js';

const propsStore = usePropsStore();
const { indexOptions, getIndexInfo } = useIndexData();

// --- STATE ---
const legendVisible = ref(true);
const legendExpanded = ref(true);
// Initialize local state FROM the global store
const localSelectedIndex = ref(propsStore.statsIndex);

// --- COMPUTED PROPERTIES ---
const legendData = computed(() => indexToColorScheme[localSelectedIndex.value] || []);

const selectedIndexDescription = computed(() => {
  const selectedOption = getIndexInfo(localSelectedIndex.value);
  return selectedOption ? selectedOption.description : '';
});

const extrusionNote = computed(() => {
    const notes = {
        combined_avgheatexposure: 'Heat Index shown by grid cell height visualisation, with a maximum height of 250m.',
        combined_heatindex_avgheatexposure: 'Normalised Landsat Surface heat shown by grid cell height visualisation, with a maximum height of 250m.',
        combined_heat_flood: 'Flood Index shown by grid cell height visualisation, with a maximum height of 250m.',
        combined_flood_heat: 'Heat Index shown by grid cell height visualisation, with a maximum height of 250m.',
    };
    return notes[localSelectedIndex.value] || null;
});

// --- METHODS ---
const handleSelectionChange = (value) => {
  propsStore.setStatsIndex(value);
};

// Watcher to sync global state back to the local component state
watch(() => propsStore.statsIndex, (newGlobalIndex) => {
  if (localSelectedIndex.value !== newGlobalIndex) {
    localSelectedIndex.value = newGlobalIndex;
  }
});
</script>

<style scoped>
#legend {
  width: 100%;
  position: relative;
  background-color: white;
}
.swatch {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.color-box {
  width: 20px;
  height: 20px;
  border: 1px solid black;
  margin-right: 5px;
}
.source-note {
  margin-top: 10px;
  font-size: 8px;
}
.source-note a {
  color: #0066cc;
  text-decoration: none;
}
.source-note a:hover {
  text-decoration: underline;
}
.gradient-legend {
  margin-bottom: 10px;
}
.gradient-bar {
  width: 100%;
  height: 20px;
  background: linear-gradient(to right, #ffffcc, #ffeda0, #feb24c, #f03b20, #bd0026);
  border: 1px solid black;
}
.gradient-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 12px;
}
.striped-legend {
  margin-top: 1rem;
}
.legend-section {
  display: flex;
  gap: 20px;
}
.extrusion-note {
  margin-top: 0.5rem;
  margin-bottom: 20px;
  font-style: italic;
}
.index-description {
  font-style: italic;
  margin-bottom: 20px;
}
</style>
