<template>
  <div class="view-mode-container">
    <label class="view-mode">
      <input type="radio" v-model="selectedMode" value="capitalRegion" @change="handleToggle('capitalRegion')">
      <span class="checkmark"></span> Helsinki View
    </label>

    <label class="view-mode">
      <input type="radio" v-model="selectedMode" value="gridView" @change="handleToggle('gridView')">
      <span class="checkmark"></span> Grid View
    </label>

    <label class="view-mode">
      <input type="radio" v-model="selectedMode" value="capitalRegionCold" @change="handleToggle('capitalRegionCold')">
      <span class="checkmark"></span> Capital Region Cold
    </label>
  </div>
</template>

<script>
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';

export default {
  data() {
    return {
      selectedMode: null, // Tracks the selected view mode
      showControlPanel: true, // Controls visibility of the control panel
    };
  },
  computed: {
    toggleStore() {
      return useToggleStore();
    },
    globalStore() {
      return useGlobalStore();
    },
  },
  methods: {
    handleToggle(mode) {
      this.resetToggles();

      if (mode === 'capitalRegion') {
        this.toggleStore.setHelsinkiView(true);
        this.globalStore.setView('helsinki');
        this.showControlPanel = true;
      } else if (mode === 'gridView') {
        this.toggleStore.setGridView(true);
        this.globalStore.setView('grid');
        this.showControlPanel = false; // Hide control panel when Grid view is selected
        this.$emit('hideControlPanel'); // Emit an event to hide control panel
      } else if (mode === 'capitalRegionCold') {
        this.toggleStore.setCapitalRegionCold(true);
        this.showControlPanel = true;
      }
    },
    resetToggles() {
      // Reset all toggle values when a new mode is selected
      this.toggleStore.setHelsinkiView(false);
      this.toggleStore.setGridView(false);
      this.toggleStore.setCapitalRegionCold(false);
    },
  },
};
</script>

<style scoped>
.view-mode-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}

.view-mode {
  display: flex;
  align-items: center;
}

.view-mode input {
  display: none;
}

/* Checkmark as a small circle */
.checkmark {
  height: 16px;
  width: 16px;
  background-color: #ccc;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  position: relative;
  cursor: pointer;
}

/* When selected, change the background color */
.view-mode input:checked + .checkmark {
  background-color: #2196F3;
}

.view-mode input:checked + .checkmark:after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}
</style>
