<template>
  <div
v-if="showGeocoding"
id="georefContainer"
>
    <!-- Search bar with search icon -->
    <v-container
fluid
class="pa-0"
>
      <v-row>
        <v-col>
          <v-text-field
            v-model="searchQuery"
            label="Enter place or address"
            prepend-inner-icon="mdi-magnify"
            outlined
            dense
            clearable
            @keyup="filterSearchResults"
          />
        </v-col>
        <v-col
class="d-flex justify-end align-center"
cols="auto"
>
          <v-btn
color="primary"
small
@click="moveToTarget"
>
Move to Target
</v-btn>
        </v-col>
      </v-row>
    </v-container>

    <!-- Search results container -->
    <v-container
v-if="showSearchResults"
fluid
class="pa-0 mt-2"
>
      <v-list dense>
        <v-list-item
          v-for="address in filteredAddresses"
          :key="address.address"
          @click="moveCameraToLocation(address)"
        >
          <v-list-item-title>{{ address.address }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-container>
  </div>
</template>


<script setup>
import { ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import { useToggleStore } from '../stores/toggleStore';
import Camera from '../services/camera';
import FeaturePicker from '../services/featurepicker';
import { eventBus } from '../services/eventEmitter';

// State variables
const showGeocoding = ref(true);
const searchQuery = ref('');
const filteredAddresses = ref([]); // Store full address objects
const showSearchResults = ref(false);
const addressData = ref([]);

// Access stores
const globalStore = useGlobalStore();
const toggleStore = useToggleStore();
const cameraService = new Camera();
const featurePicker = new FeaturePicker();

// Computed property to determine if geocoding should be shown
const shouldShowGeocoding = computed(() => {
  const view = globalStore.view.toLowerCase(); // Ensure case-insensitivity
  return view === 'helsinki' || view === 'capitalregion';
});

// Watch for changes in computed property and toggle visibility
watch(shouldShowGeocoding, (newVal) => {
  showGeocoding.value = newVal;
});

// Placeholder method for moving to the target
const moveToTarget = () => {
  // Search for a match in filteredAddresses based on searchQuery
  const matchedAddress = filteredAddresses.value.find(
    (address) => address.address.toLowerCase() === searchQuery.value.toLowerCase()
  );

  if (matchedAddress) {
    // If a match is found, move the camera to the location
    moveCameraToLocation(matchedAddress);
  } else {
    // Optionally, notify the user that no match was found
    console.log('No matching address found.');
  }
};

// Function to process geocoding API response
const processAddressData = (data) => {
  let features = [];
  data.forEach((item) => {
    const row = {
      address: item.properties.name,
      latitude: item.geometry.coordinates[1],
      longitude: item.geometry.coordinates[0],
      postalcode: item.properties.postalcode,
    };

    // Filter results to Helsinki if applicable
    if (toggleStore.helsinkiView) {
      if (
        (item.properties.locality === 'Helsinki' ||
          item.properties.localadmin === 'Helsinki') &&
        item.properties.postalcode
      ) {
        features.push(row);
      }
    } else {
      features.push(row);
    }
  });

  return features;
};

// Fetch and filter search results
const filterSearchResults = async () => {
  if (searchQuery.value.length > 2) {
    try {
      const response = await fetch(
        `/digitransit/geocoding/v1/autocomplete?text=${searchQuery.value}`
      );
      const data = await response.json();

      // Store the full address objects in addressData
      addressData.value = processAddressData(data.features);
      
      // Now store the filtered address objects (not just strings) in filteredAddresses
      filteredAddresses.value = addressData.value;

      // Show search results if there are any addresses
      showSearchResults.value = filteredAddresses.value.length > 0;
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  } else {
    showSearchResults.value = false;
  }
};

// Move the camera to the selected location
const moveCameraToLocation = (address) => {
  const { latitude, longitude, postalcode } = address;
  globalStore.setPostalCode(postalcode);
  moveCameraAndReset(longitude, latitude);
  searchQuery.value = '';
  showSearchResults.value = false;
};

// Move camera and reset related settings
const moveCameraAndReset = (longitude, latitude) => {
  cameraService.setCameraView(longitude, latitude);
  eventBus.emit('geocodingPrintEvent');
  featurePicker.loadPostalCode();

};

// Watch for changes in `searchQuery` to trigger filtering
watch(searchQuery, filterSearchResults);
</script>

<style scoped>
#georefContainer {
  width: 100%;
  max-width: 600px;
  padding: 8px;
  background-color: white;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.v-list-item {
  cursor: pointer;
}

.v-list-item:hover {
  background-color: #f5f5f5;
}
</style>

