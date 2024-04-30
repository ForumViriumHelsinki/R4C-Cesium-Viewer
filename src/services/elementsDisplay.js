import { useGlobalStore } from '../stores/globalStore.js';

export default class ElementsDisplay {
	constructor() {
		this.store = useGlobalStore();
	}

	/**
     * Changes the display of helsinki elements when user switches between postal code and grid view
    */
	setHelsinkiElementsDisplay( display ) {
		const elements = [
			'showVegetationSwitch',
			'showVegetationLabel',
			'showOtherNatureSwitch',
			'showOtherNatureLabel',
			'showTreesSwitch',
			'showTreesLabel',
			'hideNewBuildingsSwitch',
			'hideNewBuildingsLabel',            
			'hideNonSoteSwitch',
			'hideNonSoteLabel',            
			'hideLowSwitch',
			'hideLowLabel'
		];
        
		this.setElementsDisplay( elements, display );

	}

	/**
     * Changes the display of helsinki elements when user switches between postal code and grid view
    */
	setBuildingDisplay( display ) {
		const elements = [
			'hideLowSwitch',
			'hideLowLabel',
			'hideNonSoteSwitch',
			'hideNonSoteLabel'		          
		];
		
		if ( this.store.view == 'helsinki' ) {

			elements.push( 'hideNewBuildingsSwitch' );
			elements.push( 'hideNewBuildingsLabel' );
		}

		this.setElementsDisplay( elements, display );
	} 	

	/**
     * Changes the display of helsinki elements when user switches between postal code and grid view
    */
	setCapitalRegionElementsDisplay( display ) {
		const elements = [
			'landCoverSwitch',
			'landCoverLabel',
			'hideLowSwitch',
			'hideLowLabel',
			'showTreesSwitch',
			'showTreesLabel',
			'hideNonSoteSwitch',
			'hideNonSoteLabel'		          
		];

		document.getElementById( 'hideNonSoteLabel' ).textContent = 'Only public buildings';

		this.setElementsDisplay( elements, display );
	} 

	/**
     * Changes the display of tree elements
    */
	setTreeElementsDisplay( display ) {
		const elements = [
			'showTreesSwitch',
			'showTreesLabel'         
		];

		this.setElementsDisplay( elements, display );
	} 	


	setFloodElementsDisplay( display ) {

		const elements = [
			'floodLink'          
		];

		this.setElementsDisplay( elements, display );

	}

	/**
 * Changes the display of gird elements when user switches between postal code and grid view
 */
	setGridElementsDisplay( display ) {
		const elements = [
			'natureGridSwitch',
			'natureGridLabel',
			'travelTimeSwitch',
			'travelTimeLabel'
		];

		this.setElementsDisplay( elements, display );

	}

	/**
 * Changes the display of switch view elements 
 */
	setSwitchViewElementsDisplay( display ) {
		const elements = [
			'switchViewSwitch',
			'switchViewLabel'
		];

		this.setElementsDisplay( elements, display );

	}

	setColdAreasElementsDisplay( display ) {
		const elements = [
			'hideColdAreasSwitch',
			'hideColdAreasLabel'
		];

		this.setElementsDisplay( elements, display );

	}	
    
	setElementsDisplay( elements, display ) {

		elements.forEach( ( elementId ) => {
			const element = document.getElementById( elementId );
			if ( element ) {
        
				element.style.display = display;
                
			}
		} );    
	}
}