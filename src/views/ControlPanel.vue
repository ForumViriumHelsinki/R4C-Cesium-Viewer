<template>
  <div>
    <!-- Button to toggle the visibility of the Control Panel -->
    <v-btn icon @click="togglePanel" class="toggle-btn">
      <v-icon>{{ panelVisible ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-btn>

    <!-- The Vuetify Navigation Drawer (Control Panel) -->
    <v-navigation-drawer
      v-model="panelVisible"
      right
      app
      temporary
      width="300"
    >
      <v-list dense>
        <v-list-item-group>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title>Control Panel</v-list-item-title>
            </v-list-item-content>
          </v-list-item>

          <!-- Start level components -->
          <template v-if="currentLevel === 'start'">
            <v-list-item>
              <v-checkbox v-model="componentsVisible.geocoding" label="Geocoding" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.backgroundMap" label="Background Map" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.changeView" label="Change View to Helsinki" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.grid" label="Grid" />
            </v-list-item>
          </template>

          <!-- Postalcode level components -->
          <template v-if="currentLevel === 'postalcode'">
            <v-list-item>
              <v-checkbox v-model="componentsVisible.hsyScatterplot" label="HSY Scatterplot" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.heatHistogram" label="Heat Histogram" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.landCover" label="Land Cover" />
            </v-list-item>
            <v-list-item>
              <v-checkbox v-model="componentsVisible.socioEconomics" label="Socioeconomics Diagrams" />
            </v-list-item>
          </template>

          <!-- Building level components -->
          <template v-if="currentLevel === 'building'">
            <v-list-item>
              <v-checkbox v-model="componentsVisible.buildingDiagram" label="Building Diagram" />
            </v-list-item>
          </template>
        </v-list-item-group>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useGlobalStore } from '../stores/globalStore'; // Import global store for current level

export default {
  setup() {
    // Fetch the global store to determine the current level of the app (start, postalcode, building)
    const globalStore = useGlobalStore();

    // Toggle for the panel's visibility
    const panelVisible = ref(true);

    // Store visibility states for individual components
    const componentsVisible = ref({
      geocoding: true,
      backgroundMap: true,
      changeView: true,
      grid: true,
      hsyScatterplot: true,
      heatHistogram: true,
      landCover: true,
      socioEconomics: true,
      buildingDiagram: true
    });

    // Computed property to get the current level (start, postalcode, building)
    const currentLevel = computed(() => globalStore.currentLevel);

    // Function to toggle the entire control panel visibility
    const togglePanel = () => {
      panelVisible.value = !panelVisible.value;
    };

    return {
      panelVisible,
      componentsVisible,
      currentLevel,
      togglePanel,
    };
  },
};
</script>

<style scoped>
.toggle-btn {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 999;
}
</style>
