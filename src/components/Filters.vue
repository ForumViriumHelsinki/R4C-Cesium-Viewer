<template>
  <!-- Add Filters Title -->
  <div class="slider-container">
    <h3 class="filter-title">Filters</h3>
    <div class="switch-container">
      <label class="switch">
        <input type="checkbox" v-model="hideNonSote" @change="filterBuildings" />
        <span class="slider round"></span>
      </label>
      <label for="hideNonSote" class="label">Only public buildings</label>
    </div>

    <div class="switch-container" v-if="helsinkiView">
      <label class="switch">
        <input type="checkbox" v-model="hideNewBuildings" @change="filterBuildings" />
        <span class="slider round"></span>
      </label>
      <label for="hideNewBuildings" class="label">Built before summer 2018</label>
    </div>

    <div class="switch-container">
      <label class="switch">
        <input type="checkbox" v-model="hideLow" @change="filterBuildings" />
        <span class="slider round"></span>
      </label>
      <label for="hideLow" class="label">Only tall buildings</label>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { eventBus } from '../services/eventEmitter.js';
import Building from '../services/building.js';

export default {
  setup() {
    const hideNonSote = ref(false);
    const hideNewBuildings = ref(false);
    const hideLow = ref(false);

    const toggleStore = useToggleStore();
    const globalStore = useGlobalStore();
    let buildingService = null;

    const helsinkiView = computed( () => toggleStore.helsinkiView );

    const filterBuildings = () => {
        toggleStore.setHideNonSote(hideNonSote.value);
        toggleStore.setHideNewBuildings(hideNewBuildings.value);
        toggleStore.setHideLow(hideLow.value);

        const buildingsDataSource = globalStore?.cesiumViewer?.dataSources?.getByName(`Buildings ${globalStore.postalcode}`)[0];
        if (buildingsDataSource) {
            if (hideNonSote.value || hideNewBuildings.value || hideLow.value) {
                buildingService.filterBuildings(buildingsDataSource);
            } else {
                buildingService.showAllBuildings(buildingsDataSource);
            }
            if (!toggleStore.helsinkiView) {
                eventBus.emit('updateScatterPlot');
            }
      }
    };

    onMounted(() => {
      buildingService = new Building();
    });

    return {
        helsinkiView,
        hideNonSote,
        hideNewBuildings,
        hideLow,
        filterBuildings,
    };
  },
};
</script>

<style scoped>
.filter-title {
  font-size: 1.2em;
  margin-bottom: 10px;
  font-family: sans-serif;
}

.slider-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  padding: 10px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 200px;
}

/* Align switch and label horizontally */
.switch-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.switch {
  position: relative;
  display: inline-block;
  width: 47px;
  height: 20px;
}

/* The slider input */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Align label to the right of the slider */
.label {
  margin-left: 10px; /* Space between slider and label */
  font-size: 14px;
  font-family: Arial, sans-serif;
}
</style>

