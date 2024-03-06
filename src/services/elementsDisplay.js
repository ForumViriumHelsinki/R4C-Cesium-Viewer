export default class ElementsDisplay {
	constructor() {

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
	setLandCoverElementsDisplay( display ) {
		const elements = [
			'landCoverSwitch',
			'landCoverLabel'          
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
 * Changes the display of postal code elements when user switches between postal code and population view
 */
	setPostalCodeElementsDisplay( display ) {
		const elements = [
			'showVegetationSwitch',
			'showVegetationLabel',
			'showOtherNatureSwitch',
			'showOtherNatureLabel',
			'hideNewBuildingsSwitch',
			'hideNewBuildingsLabel',
			'hideNonSoteSwitch',
			'hideNonSoteLabel',
			'hideLowSwitch',
			'hideLowLabel',
			'showTreesSwitch',
			'showTreesLabel',
			'switchViewSwitch',
			'switchViewLabel',
			'georefContainer'
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
    
	setElementsDisplay( elements, display ) {

		elements.forEach( ( elementId ) => {
			const element = document.getElementById( elementId );
			if ( element ) {
        
				element.style.display = display;
                
			}
		} );    
	}
}