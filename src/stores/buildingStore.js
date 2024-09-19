import { defineStore } from 'pinia';

export const useBuildingStore = defineStore( 'building', {
	state: () => ( {
		buildingFeatures: null,
	} ),
	actions: {
		setBuildingFeatures( buildings ) {
			this.buildingFeatures = buildings;
		}
	},
} );