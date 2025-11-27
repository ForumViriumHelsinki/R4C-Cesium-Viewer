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
	 */
	constructor() {
		this.toggleStore = useToggleStore();
	}

	/**
	 * Controls visibility of Helsinki-specific UI elements
	 * Shows/hides vegetation, trees, and building filter controls.
	 *
	 * Affected elements:
	 * - Vegetation toggle and label
	 * - Other nature toggle and label
	 * - Trees toggle and label
	 * - New buildings filter toggle and label
	 * - Non-SOTE buildings filter toggle and label
	 * - Low building filter toggle and label
	 *
	 * @param {string} display - CSS display value ('none', 'block', 'inline-block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setHelsinkiElementsDisplay('block'); // Show Helsinki controls
	 * elementsDisplay.setHelsinkiElementsDisplay('none'); // Hide Helsinki controls
	 */
	setHelsinkiElementsDisplay(display) {
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
			'hideLowLabel',
		];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of building filter elements
	 * Conditionally includes new buildings filter based on Helsinki view state.
	 * Used when switching between postal code and grid view.
	 *
	 * Affected elements:
	 * - Low building filter toggle and label
	 * - Non-SOTE buildings filter toggle and label
	 * - New buildings filter (Helsinki view only)
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setBuildingDisplay('block'); // Show building filters
	 * elementsDisplay.setBuildingDisplay('none'); // Hide building filters
	 */
	setBuildingDisplay(display) {
		const elements = ['hideLowSwitch', 'hideLowLabel', 'hideNonSoteSwitch', 'hideNonSoteLabel'];

		if (this.toggleStore.helsinkiView) {
			elements.push('hideNewBuildingsSwitch');
			elements.push('hideNewBuildingsLabel');
		}

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of view mode selection elements
	 * Conditionally includes Capital Region toggle based on Helsinki view state.
	 * Used when switching between postal code and grid view.
	 *
	 * Affected elements:
	 * - Grid view toggle and label
	 * - Capital region toggle (non-Helsinki view only)
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setViewDisplay('block'); // Show view mode controls
	 * elementsDisplay.setViewDisplay('none'); // Hide view mode controls
	 */
	setViewDisplay(display) {
		const elements = ['gridViewSwitch', 'gridViewLabel'];

		if (!this.toggleStore.helsinkiView) {
			elements.push('capitalRegionSwitch');
			elements.push('capitalRegionViewLabel');
		}

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of Capital Region-specific UI elements
	 * Shows/hides building and tree filter controls for capital region view.
	 * Also updates the non-SOTE label text to "Only public buildings".
	 *
	 * Affected elements:
	 * - Low building filter toggle and label
	 * - Trees toggle and label
	 * - Non-SOTE buildings filter (relabeled as "Only public buildings")
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setCapitalRegionElementsDisplay('block'); // Show Capital Region controls
	 * elementsDisplay.setCapitalRegionElementsDisplay('none'); // Hide Capital Region controls
	 */
	setCapitalRegionElementsDisplay(display) {
		const elements = [
			'hideLowSwitch',
			'hideLowLabel',
			'showTreesSwitch',
			'showTreesLabel',
			'hideNonSoteSwitch',
			'hideNonSoteLabel',
		];

		document.getElementById('hideNonSoteLabel').textContent = 'Only public buildings';

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of tree layer elements
	 * Controls visibility of tree visualization toggle and label.
	 *
	 * Affected elements:
	 * - Trees toggle and label
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setTreeElementsDisplay('block'); // Show tree controls
	 * elementsDisplay.setTreeElementsDisplay('none'); // Hide tree controls
	 */
	setTreeElementsDisplay(display) {
		const elements = ['showTreesSwitch', 'showTreesLabel'];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of flood-related elements
	 * Controls visibility of external flood data links.
	 *
	 * Affected elements:
	 * - Flood data link
	 *
	 * @param {string} display - CSS display value ('none', 'block', 'inline', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setFloodElementsDisplay('inline'); // Show flood link
	 * elementsDisplay.setFloodElementsDisplay('none'); // Hide flood link
	 */
	setFloodElementsDisplay(display) {
		const elements = ['floodLink'];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of grid-specific elements
	 * Shows/hides nature grid and travel time visualization controls.
	 * Used when switching between postal code and grid view.
	 *
	 * Affected elements:
	 * - Nature grid toggle and label
	 * - Travel time toggle and label
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setGridElementsDisplay('block'); // Show grid controls
	 * elementsDisplay.setGridElementsDisplay('none'); // Hide grid controls
	 */
	setGridElementsDisplay(display) {
		const elements = ['natureGridSwitch', 'natureGridLabel', 'travelTimeSwitch', 'travelTimeLabel'];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of view switching elements
	 * Controls 2D/3D view mode toggle visibility.
	 *
	 * Affected elements:
	 * - Switch view toggle and label (2D/3D mode)
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setSwitchViewElementsDisplay('block'); // Show view switch
	 * elementsDisplay.setSwitchViewElementsDisplay('none'); // Hide view switch
	 */
	setSwitchViewElementsDisplay(display) {
		const elements = ['switchViewSwitch', 'switchViewLabel'];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Changes the display of cold areas layer elements
	 * Controls visibility of cold area overlay toggle and label.
	 *
	 * Affected elements:
	 * - Hide cold areas toggle and label
	 *
	 * @param {string} display - CSS display value ('none', 'block', etc.)
	 * @returns {void}
	 *
	 * @example
	 * elementsDisplay.setColdAreasElementsDisplay('block'); // Show cold areas control
	 * elementsDisplay.setColdAreasElementsDisplay('none'); // Hide cold areas control
	 */
	setColdAreasElementsDisplay(display) {
		const elements = ['hideColdAreasSwitch', 'hideColdAreasLabel'];

		this.setElementsDisplay(elements, display);
	}

	/**
	 * Core utility to set display style for multiple DOM elements
	 * Safely handles missing elements by checking for existence before modifying.
	 * Used internally by all specific element display methods.
	 *
	 * @param {string[]} elements - Array of element IDs to modify
	 * @param {string} display - CSS display value to apply ('none', 'block', 'inline', etc.)
	 * @returns {void}
	 * @private
	 *
	 * @example
	 * this.setElementsDisplay(['elem1', 'elem2', 'elem3'], 'none');
	 * // Sets display:none for all three elements (skips any that don't exist)
	 */
	setElementsDisplay(elements, display) {
		elements.forEach((elementId) => {
			const element = document.getElementById(elementId);
			if (element) {
				element.style.display = display;
			}
		});
	}
}
