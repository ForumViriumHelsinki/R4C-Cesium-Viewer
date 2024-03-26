
import { useToggleStore } from '../stores/toggleStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from './datasource.js';
import HSYBuilding from './hsybuilding.js';
import ElementsDisplay from './elementsDisplay.js';

export default class CapitalRegion {
	constructor( ) {
		this.toggleStore = useToggleStore();
		this.store = useGlobalStore();
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

		this.hSYBuildingService.loadHSYBuildings();	
		await this.datasourceService.loadGeoJsonDataSource( 0.0, './assets/data/hsy_po.json', 'PostCodes' );

		if ( Number ( this.store.postalcode ) < 1000 ) {

			this.elementsDisplayService.setTreeElementsDisplay( 'inline-block' );

		}

		this.addPostalCodeDataToPinia();

	}

	addPostalCodeDataToPinia( ) {

		const dataSource = this.datasourceService.getDataSourceByName( 'PostCodes' );
		this.store.postalCodeData = dataSource;
	}     
}