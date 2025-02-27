import { defineStore } from 'pinia';

export const useBackgroundMapStore = defineStore( 'backgroundMap', {
	state: () => ( {
		hsyYear: 2024,
		hsySelectArea: 'Askisto',   
		hSYWMSLayers: null,
        ndviDate: '2022-06-26',
		tiffLayers: [],
		landcoverLayers: [],		
		floodLayers: [],		
	} ),
	actions: {
		setFloodLayers( layers ){
			this.floodLayers = layers;
		},			
		setLandcoverLayers( layers ){
			this.landcoverLayers = layers;
		},		
		setTiffLayers( layers ){
			this.tiffLayers = layers;
		},
		setNdviDate( date ){
			this.ndviDate = date;
		},	        
		setHSYWMSLayers( layers ) {
			this.hSYWMSLayers = layers;
		},				
		setHSYSelectArea( area ) {
			this.hsySelectArea = area;
		},	
		setHSYYear( year ) {
			this.hsyYear = year;
		},
	},
} );