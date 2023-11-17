export default class Gridview {

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

    elements.forEach(( elementId ) => {
        const element = document.getElementById( elementId );
        if (element) {

            element.style.display = display;
        
        }
    });
}
}