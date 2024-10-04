<template>
  <v-select
      v-model="selectedYear"
      :items="yearOptions"
      label="Select Year"
      density="compact"
      variant="underlined"
  />
</template>

<script>
import { ref, watch } from 'vue';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
import WMS from '../services/wms.js';

export default {
	setup() {
		const propsStore = usePropsStore();
		const yearOptions = [ 2022, 2020, 2018, 2016 ];
		const selectedYear = ref( 2022 );

		watch( () => selectedYear.value, ( newValue ) => {
			propsStore.setHSYYear( newValue );
			const wmsService = new WMS();
			wmsService.reCreateHSYImageryLayer();
			eventBus.emit( 'recreate piechart' );
		} );

		return {
			selectedYear,
			yearOptions,
		};
	},
};
</script>