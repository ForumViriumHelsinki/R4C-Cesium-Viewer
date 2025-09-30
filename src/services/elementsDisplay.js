import { useToggleStore } from '../stores/toggleStore.js';

/**
 * Elements Display Service
 * Manages UI element visibility based on view mode and application state.
 * Controls display of layer toggles, filters, and mode-specific controls
 * for Helsinki view, Capital Region view, grid view, and postal code view.
 *
 * Manages visibility for:
 * - Building filters (age, purpose, floor count)
 * - Nature layers (trees, vegetation, other nature)
 * - View mode controls (grid, 2D/3D switch)
 * - Flood data links
 * - Travel time controls
 * - Cold area overlays
 *
 * @class ElementsDisplay
 */
export default class ElementsDisplay {
	/**
	 * Creates an ElementsDisplay service instance
	 * @constructor
	 */
	constructor() {
		this.toggleStore = useToggleStore();
	}

	/**
	 * Controls visibility of Helsinki-specific UI elements
	 * Shows/hides vegetation, trees, and building filter controls.
	 *
	 * @param {string} display - CSS display value ('none', 'block', 'inline-block', etc.)
	 * @returns {void}
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
		
		if ( this.toggleStore.helsinkiView ) {

			elements.push( 'hideNewBuildingsSwitch' );
			elements.push( 'hideNewBuildingsLabel' );
		}

		this.setElementsDisplay( elements, display );
	} 	

	/**
     * Changes the display of helsinki elements when user switches between postal code and grid view
    */
	setViewDisplay( display ) {
		const elements = [
			'gridViewSwitch',
			'gridViewLabel',		          
		];

		if ( !this.toggleStore.helsinkiView ) {

			elements.push( 'capitalRegionSwitch' );
			elements.push( 'capitalRegionViewLabel' );

		}

		this.setElementsDisplay( elements, display );
	}

	/**
     * Changes the display of helsinki elements when user switches between postal code and grid view
    */
	setCapitalRegionElementsDisplay( display ) {
		const elements = [
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