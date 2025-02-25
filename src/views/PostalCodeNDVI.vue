<template>
  <v-container>
    <v-row>
      <!-- Left: Radio Buttons -->
      <v-col cols="4">
        <v-radio-group v-model="selectedDate" dense @change="updateImage" :disabled="!ndvi">
          <v-radio
            v-for="date in availableDates"
            :key="date"
            :label="date"
            :value="date"
            class="small-radio"
            />
        </v-radio-group>
      </v-col>

      <!-- Right: NDVI Chart -->
      <v-col cols="8">
        <NDVIChart :selectedDate="selectedDate" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { onMounted, ref, onBeforeUnmount } from "vue";
import { useToggleStore } from "../stores/toggleStore.js";
import { useBackgroundMapStore } from "../stores/backgroundMapStore.js";
import { storeToRefs } from "pinia";
import { eventBus } from '../services/eventEmitter.js';
import { changeTIFF } from '../services/tiffImagery.js';

export default {
  setup() {
    const toggleStore = useToggleStore();
    const backgroundMapStore = useBackgroundMapStore();

    // Make ndvi reactive
    const { ndvi } = storeToRefs(toggleStore);

    const selectedDate = ref("2022-06-26"); // Default date
    const availableDates = [
      "2017-06-04",
      "2018-06-17",
      "2019-07-27",
      "2020-06-26",
      "2021-06-18",
      "2022-06-26",
      "2023-06-23",
      "2024-06-27",
    ];

    const updateImage = async () => {
      backgroundMapStore.setNdviDate( selectedDate.value );
      changeTIFF( );
    }

    onMounted(async () => {
      eventBus.on("addNDVI", updateImage);
      if (ndvi.value) {
        await updateImage();
      }
    });

    onBeforeUnmount(() => {
      eventBus.off("addNDVI", updateImage);
    });    

    return { selectedDate, availableDates, updateImage, ndvi };
  },
};
</script>

<style scoped>
/* Small radio buttons */
.small-radio {
  font-size: 12px;
  margin-right: 5px;
}
</style>
