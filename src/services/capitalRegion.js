
import { useToggleStore } from '../stores/toggleStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from './datasource.js';
import HSYBuilding from './hsybuilding.js';

export default class CapitalRegion {
	constructor( ) {
		this.toggleStore = useToggleStore();
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.hSYBuildingService = new HSYBuilding();
		this.datasourceService = new DataSource();
	}

	/**
    * Load Helsinki elements depending on toggle values
    * 
    */
	loadCapitalRegionElements( ) {

		this.hSYBuildingService.loadHSYBuildings();	
		this.datasourceService.loadGeoJsonDataSource( 0.0, './assets/data/hsy_po.json', 'PostCodes' );

	}     
}