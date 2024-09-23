<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-message">
      Loading data, please wait
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';

export default {
	setup() {
		const store = useGlobalStore();
		const visible = ref( false );

		// Watch the store.isLoading property to control the visibility
		watch(
			() => store.isLoading,
			( newVal ) => {
				visible.value = newVal;
			},
			{ immediate: true }
		);

		return {
			visible,
		};
	},
};
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.2); /* White transparent background */
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* Allow mouse events to pass through */
  z-index: 1000;
}

.loading-message {
  font-size: 18px;
  font-weight: bold;
  color: black;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  pointer-events: all; /* Make the message box interactive if needed */
}
</style>
