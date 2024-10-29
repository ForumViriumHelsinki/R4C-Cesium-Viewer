import { defineStore } from 'pinia';

export const useBuildingStore = defineStore( 'building', {
	state: () => ( {
		buildingFeatures: null,
		timeseriesDate: '2023-06-23'
	} ),
	actions: {
		setBuildingFeatures( buildings ) {
			this.buildingFeatures = buildings;
		},
		settTimeseriesDate( date ) {
			this.timeseriesDate = date;
		},
	},
} );