
import { useToggleStore } from '../stores/toggleStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { eventBus } from '../services/eventEmitter.js';
import DataSource from './datasource.js';
import HSYBuilding from './hsybuilding.js';
import ElementsDisplay from './elementsDisplay.js';

export default class CapitalRegion {
	constructor( ) {
		this.toggleStore = useToggleStore();
		this.store = useGlobalStore();
		this.propsStore = usePropsStore();
		this.viewer = this.store.cesiumViewer;
		this.hSYBuildingService = new HSYBuilding();
		this.datasourceService = new DataSource();
		this.elementsDisplayService = new ElementsDisplay();
	}

	/**
    * Load Helsinki elements depending on toggle values
    * 
    */
	async loadCapitalRegionElements( ) {

		if ( Number ( this.store.postalcode ) < 1000 ) {

			this.elementsDisplayService.setTreeElementsDisplay( 'inline-block' );

		}
		
		this.hSYBuildingService.loadHSYBuildings();	

	}

	async addPostalCodeDataToPinia( ) {

		const dataSource = this.datasourceService.getDataSourceByName( 'PostCodes' );
		this.propsStore.setPostalCodeData( dataSource );

	}     
}