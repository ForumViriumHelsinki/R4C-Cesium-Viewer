export default class Postalcodeview {

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

    elements.forEach(( elementId ) => {
        const element = document.getElementById( elementId );
        if (element) {

            element.style.display = display;
        
        }
    });
}

/**
 * Changes the display of switch view elements 
 */
setSwitchViewElementsDisplay( display ) {
    const elements = [
        'switchViewSwitch',
        'switchViewLabel'
    ];

    elements.forEach(( elementId ) => {
        const element = document.getElementById( elementId );
        if (element) {

            element.style.display = display;
        
        }
    });
}
}