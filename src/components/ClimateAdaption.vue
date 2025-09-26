<template>
  <v-navigation-drawer
    v-if="drawerOpen"
    v-model="drawerOpen"
    location="left"
    width="300"
    temporary
    class="climate-adaption-panel"
  >
    <v-card
      flat
      class="d-flex flex-column"
      style="height: 100%;"
    >
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
          mdi-shield-sun
        </v-icon>
        Climate Adaptation
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="drawerOpen = false"
        />
      </v-card-title>

      <!-- Tabs -->
      <v-tabs
        v-model="tab"
        grow
      >
        <v-tab value="centers">
          Cooling Centers
        </v-tab>
        <v-tab value="optimizer">
          Optimizer
        </v-tab>
        <v-tab value="parks">
          Green Spaces
        </v-tab>
      </v-tabs>

      <!-- Content -->
      <v-card-text class="flex-grow-1 overflow-y-auto">
        <v-window v-model="tab">
          <v-window-item value="centers" class="pa-1">
            <CoolingCenter />
          </v-window-item>
          <v-window-item value="optimizer" class="pa-1">
            <CoolingCenterOptimiser />
          </v-window-item>
          <v-window-item value="parks" class="pa-1">
            <LandcoverToParks />
          </v-window-item>
        </v-window>

        <div class="pa-2 mt-2">
          <EstimatedImpacts />
        </div>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, watch } from 'vue';
import CoolingCenter from './CoolingCenter.vue';
import CoolingCenterOptimiser from './CoolingCenterOptimiser.vue';
import EstimatedImpacts from './EstimatedImpacts.vue';
import LandcoverToParks from './LandcoverToParks.vue';

// Props + emits
const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const tab = ref('centers');

// Local reactive copy to sync with v-model
const drawerOpen = ref(false);

// Watch for prop changes → update local state
watch(
  () => props.modelValue,
  (val) => {
    drawerOpen.value = val;
  },
  { immediate: true }
);

// Watch local state → emit update
watch(drawerOpen, (val) => {
  if (val !== props.modelValue) {
    emit('update:modelValue', val);
  }
});
</script>

<style scoped>
.climate-adaption-panel {
  z-index: 2400;
}

.climate-adaption-panel .v-card {
  height: 100%;
  border-radius: 0;
}
</style>
