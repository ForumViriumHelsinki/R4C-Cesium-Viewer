function initViewer() {

    // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
    const viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider : new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        fullscreenButton: false,
        geocoder: false,
        shadows: false,
        navigationHelpButton: false,
        timeline: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        infoBox: false,
        homeButton: false
    });

    viewer.imageryLayers.add( createImageryLayer( 'avoindata:Karttasarja_PKS' ) );
  
    // Fly the camera to Helsinki at the given longitude, latitude, and height.
    viewer.camera.flyTo({
        destination : Cesium.Cartesian3.fromDegrees( 24.931745, 60.190464, 35000 ), 
        orientation : {
            heading : Cesium.Math.toRadians(0.0),
            pitch : Cesium.Math.toRadians(-85.0),
      }
    });
    
    // Load post code zones & energy data availability tags
    loadGeoJsonDataSource( 0.2, 'assets/data/hki_po_clipped.json', 'PostCodes' );
    
	//Experimental scripts for playing around with the objects, and retrieving their information...
	document.getElementById("cesiumContainer").addEventListener("click", function() { processClick( viewer, event ) });
	//Attaching UI events...
	addEventListener('input', ( event ) => { sliderEvents( event ) } );
    addEventListener('change', ( event ) => { selectEvents( event ) } );

    //disable switch for showing heat exposure on nature areas
    document.getElementById( "hideNonSoteToggle" ).disabled = true;
    document.getElementById( "hideNewBuildingsToggle" ).disabled = true;
    document.getElementById( "hideLowToggle" ).disabled = true;
    document.getElementById( "switchViewToggle" ).disabled = true;
    setGridElementsDisplay( 'none' );
    addGeocodingEventListeners( viewer );

    viewer.scene.postRender.addEventListener(function () {
        viewer.scene.globe._surface.tileProvider._debug.disableCulling = true;
    });

    // Call the function to set up the bearing switches
    setupBearingSwitches();

    const hriCredit = new Cesium.Credit('<a href="https://hri.fi/data/fi/dataset" target="_blank"><img src="assets/images/hero_logo_50x25.png" title="assets/images/Helsinki Region Infoshare"/></a>');
    const statsCredit = new Cesium.Credit('<a href="https://www.stat.fi/org/avoindata/paikkatietoaineistot_en.html" target="_blank"><img src="assets/images/tilastokeskus_en_75x25.png" title="Statistics Finland"/></a>');
    const hsyCredit = new Cesium.Credit('<a href="https://www.hsy.fi/en/air-quality-and-climate/geographic-information/open-geographic-information-interfaces/" target="_blank"><img src="assets/images/hsy-logo_41x25px.png" title="HSY"/></a>');
    viewer.cesiumWidget.creditContainer.appendChild(hriCredit.element);
    viewer.cesiumWidget.creditContainer.appendChild(statsCredit.element);
    viewer.cesiumWidget.creditContainer.appendChild(hsyCredit.element);

  return viewer;
}