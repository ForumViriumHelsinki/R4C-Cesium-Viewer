import { useToggleStore } from '../stores/toggleStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import DataSource from './datasource.js';
import ElementsDisplay from './elementsDisplay.js';
import Building from './building.js';
import Vegetation from './vegetation.js';
import OtherNature from './othernature.js';
import Tree from './tree.js';

export default class Helsinki {
	constructor( ) {
		this.toggleStore = useToggleStore();
        this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
        this.buildingService = new Building();
        this.elementsDisplayService = new ElementsDisplay();
        this.datasourceService = new DataSource();
		this.vegetationService = new Vegetation();
		this.otherNatureService = new OtherNature();
		this.treeService = new Tree();
	}

    /**
    * Load Helsinki elements depending on toggle values
    * 
    */
	loadHelsinkiElements( ) {

		this.elementsDisplayService.setHelsinkiElementsDisplay( 'inline-block' );
		this.buildingService.loadBuildings( );	
		this.datasourceService.loadGeoJsonDataSource( 0.0, './assets/data/hki_po_clipped.json', 'PostCodes' );
        this.loadHelsinkiGreenElements( );

	} 

    /**
    * Load Helsinki Green elements depending on toggle values
    * 
    */
	loadHelsinkiGreenElements( ) {

		if ( this.toggleStore.showVegetation ) {

			this.vegetationService.loadVegetation();
    
		}

		if ( this.toggleStore.showTrees ) {

			this.treeService.loadTrees();

		}

		if ( this.toggleStore.OtherNature ) {

			this.otherNatureService.loadOtherNature();

		}	
	}    
    
}