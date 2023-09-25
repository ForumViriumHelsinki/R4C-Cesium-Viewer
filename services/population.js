
/**
 * Changes the display of postal code elements when user switches between postal code and population view
 */
function setPostalCodeElementsDisplay( display ) {
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
 * Set population grid entities heat exposure
 *
 * @param { Object } entities Cesium entities
 */
function setHeatExposureToGrid( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];
		setGridEntityPolygon( entity );

	}
}

/**
 * Set grid entity polygon
 *
 * @param { Object } entity grid entity
 */
function setGridEntityPolygon( entity ) {

	if ( entity.properties.averageheatexposure && entity.polygon ) {

		entity.polygon.material = new Cesium.Color( 1, 1 - entity.properties.averageheatexposure._value, 0, entity.properties.averageheatexposure._value );

	} else {

		if ( entity.polygon ) {
			
			entity.show = false;

		}
	}

}

function setGridHeight( entities ) {

	for ( let i = 0; i < entities.length; i++ ) {

		let entity = entities[ i ];

		if ( entity.polygon ) {

			if ( entity.properties.asukkaita ) {

				entity.polygon.extrudedHeight = entity.properties.asukkaita._value / 4;
	
			} 
		}
	}
}
