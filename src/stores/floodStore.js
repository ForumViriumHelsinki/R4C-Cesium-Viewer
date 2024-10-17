import { defineStore } from 'pinia';

export const useFloodStore = defineStore( 'flood', {
	state: () => ( {
		path: './assets/data/56mm4h.geojson',
		description: '2019-08-23 56 mm of rain in 4 hours',
		data: null,
	} ),
	actions: {	
		setPath( path ) {
			this.path = path;
		},
		setDescription( description ) {
			this.description = description;
		},	
		setData( data ) {
			this.data = data;
		}		
	},
} );