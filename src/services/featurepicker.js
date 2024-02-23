import * as Cesium from "cesium";
import Datasource from "./datasource.js"; 
import PrintBoxService from "./printbox.js"; 
import Reset from "./reset.js";
import Building from "./building.js";
import Postalcodeview from "./postalcodeview.js";
import Plot from "./plot.js"
import Traveltime from "./traveltime.js"
import Flood from "./flood.js"
import HSYBuilding from "./hsybuilding.js"
import { useGlobalStore } from '../stores/globalStore.js';

export default class FeaturePicker {
    constructor( viewer ) {
      this.viewer = viewer;
      this.datasourceService = new Datasource( this.viewer );
      this.printBoxService = new PrintBoxService( this.viewer );
      this.resetService = new Reset( this.viewer );
      this.buildingService = new Building( this.viewer );
      this.postalCodeViewService = new Postalcodeview( );
      this.plotService = new Plot( );
      this.store = useGlobalStore( );
      this.floodService = new Flood( this.viewer );
      this.traveltimeService = new Traveltime( this.viewer );
      this.hSYBuildingService = new HSYBuilding( this.viewer );

    }
  
    /**
    * Processes the click event on the viewer
    * 
    * @param {Cesium.Viewer} viewer - The Cesium viewer object
    * @param {MouseEvent} event - The click event
    */
    processClick( event ) {
        console.log("Clicked at " + String( event.x ) + ", " + String( event.y ));
        this.pickEntity( new Cesium.Cartesian2( event.x, event.y ) );
    }    
    
    /**
    * Picks the entity at the given window position in the viewer
    * 
    * @param { String } viewer - The Cesium viewer object
    * @param { String } windowPosition - The window position to pick the entity
    */
    pickEntity( windowPosition ) {
       let picked = this.viewer.scene.pick( windowPosition );
       
       if ( picked ) {
           
           let id = Cesium.defaultValue( picked.id, picked.primitive.id );
           
           if ( picked.id._polygon ) {
               
               if ( id instanceof Cesium.Entity ) {
                   
                   this.printCesiumEntity( picked , id );

                }
               
               if ( picked.id.properties ) {
   
                   // this.hidePlotlyIfNatureFeatureIsClicked( picked.id.properties.category );
                   this.handleFeatureWithProperties( picked.id );
                   
                }
            }
        }
    }
    
    
    /**
    * Prints the properties of the picked Cesium entity
    * 
    * @param {Object} picked - The picked Cesium entity
    * @param {Object} id - The ID of the picked entity
    */
    printCesiumEntity( picked, id ) {

        document.getElementById( 'printContainer' ).scroll({
            top: 0,
            behavior: 'instant'
        });

        if ( picked.id._polygon && picked.id.properties ) {
            var toPrint = "<u>Found following properties & values:</u><br/>";	

            //Highlight for clicking...
            let oldMaterial = id.polygon.material;
            id.polygon.material = new Cesium.Color( 1, 0.5, 0.5, 0.8 );
            setTimeout(() => { id.polygon.material = oldMaterial }, 500 );

            let length = picked.id.properties.propertyNames.length;
            for ( let i = 0; i < length; ++i ) {

                toPrint = toPrint + picked.id.properties.propertyNames[ i ] + ": " + picked.id.properties[ picked.id.properties.propertyNames[ i ] ] + "<br/>";

            };
        }

        console.log(toPrint);

        this.addToPrint( toPrint, picked.id.properties.posno )    

    }

    /**
    * Adds the provided content to the print container
    * 
    * @param {string} toPrint - The content to be added to the print container
    * @param {string} postno - The postal code associated with the content
    */  
    addToPrint( toPrint, postno ) {

        if ( postno ) {

            toPrint = toPrint + "<br/><br/><i>Click on objects to retrieve information.</i>"
    
        } else {
    
            toPrint = toPrint + "<br/><br/><i>If average urban heat exposure of building is over 0.5 the nearest location with under 0.4 heat exposure is shown on map.</i>"
    
        }
    
        document.getElementById('printContainer').innerHTML = toPrint;
        document.getElementById('printContainer').scroll({
              top: 1000,
              behavior: 'smooth'
        });    
    }
  
    handlePostalCodeFeature( postcode ) {
        // Find the data source for postcodes
        const postCodesDataSource = this.viewer.dataSources._dataSources.find( ds => ds.name === "PostCodes" );
    
        // Iterate over all entities in the postcodes data source.
        for ( let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++ ) {
        
            let entity = postCodesDataSource._entityCollection._entities._array[ i ];
        
            // Check if the entity posno property matches the postalcode.
            if ( entity._properties._posno._value  == postcode ) {
        
                // TODO create function that takes size of postal code area and possibile location by the sea into consideration and sets y and z based on thse values
                this.viewer.camera.flyTo( {
                    destination: Cesium.Cartesian3.fromDegrees( entity._properties._center_x._value, entity._properties._center_y._value - 0.025, 2000 ),
                    orientation: {
                        heading: 0.0,
                        pitch: Cesium.Math.toRadians( -35.0 ),
                        roll: 0.0
                    },
                    duration: 3
                });
            
                document.getElementById( "switchViewToggle" ).disabled = false;
                this.loadPostalCode( postcode );
            }
        }   
    }
  
    loadPostalCode( postcode ) {
        document.getElementById( "hideNonSoteToggle" ).disabled = false;
        document.getElementById( "hideNewBuildingsToggle" ).disabled = false;
        document.getElementById( "hideLowToggle" ).disabled = false;
        document.getElementById( "showTreesToggle" ).disabled = false;

        this.postalCodeViewService.setSwitchViewElementsDisplay( 'inline-block' );
    
        console.log("Postal code area found!");
    
        this.datasourceService.removeDataSourcesAndEntities();
        
        if ( this.store.showVegetation ) {
            
            // loadNatureAreas( postcode );
        
        }
    
        if ( this.store.view == 'capitalRegion' ) {
              
            this.hSYBuildingService.loadHSYBuildings( postcode );	
            this.datasourceService.loadGeoJsonDataSource( 0.0, './assets/data/hsy_po.json', 'PostCodes' );
    
        } else {
        
            this.buildingService.loadBuildings( postcode );	
            this.datasourceService.loadGeoJsonDataSource( 0.0, './assets/data/hki_po_clipped.json', 'PostCodes' );
    
        }

        this.store.level = 'postalCode';
    
        // add laajasalo flood data
        if ( postcode == '00870' || postcode == '00850' || postcode == '00840' || postcode == '00590' ) {
            
            this.floodService.updateFloodSwitch( 'inline-block' );
    
        }    
    }
    
    handleBuildingFeature( buildingHeatExposure, address, postinumero, treeArea, avgTempC ) {
        
        this.plotService.togglePostalCodePlotVisibility( 'hidden' );
        this.plotService.toggleBearingSwitchesVisibility( 'hidden' );
        document.getElementById( 'nearbyTreeAreaContainer' ).style.visibility = 'hidden';
        this.buildingService.createBuildingCharts( buildingHeatExposure, address, postinumero, treeArea, avgTempC );
        this.store.postalcode = postinumero;
        this.store.level = 'building';

    }
    
    addColdPoint( location ) {
    
        const coordinates = location.split(","); 
    
        this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees( Number( coordinates[ 1 ] ), Number(coordinates[ 0 ] ) ),
            name: "coldpoint",
            point: {
              show: true, 
              color: Cesium.Color.ROYALBLUE, 
              pixelSize: 15, 
              outlineColor: Cesium.Color.LIGHTYELLOW, 
              outlineWidth: 5, 
            },
          });
    
    }
    
removeEntityByName( name ) {

    this.viewer.entities._entities._array.forEach( ( entity ) => {

        if ( entity.name === name ) {

            this.viewer.entities.remove( entity );

        }
    });
}
    
    markCurrentLocation( entity ) {
    
        const hierarchy = entity.polygon.hierarchy.getValue().positions;
    
        // Calculate the center of the polygon's vertices
        const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy);
        const centerCartesian = boundingSphere.center;
    
        this.viewer.entities.add({
            position: centerCartesian,
            name: "currentLocation",
            point: {
              show: true, 
              color: Cesium.Color.BLACK, 
              pixelSize: 42, 
              outlineColor: Cesium.Color.BLACK, 
              outlineWidth: 14, 
              eyeOffset: new Cesium.Cartesian3( 0, 200, -200 ),
              scaleByDistance: new Cesium.NearFarScalar(4000, 1, 40000, 0.0)
            },
          });
    
    
    }
    
    /**
     * Handles the feature with properties
     * 
     * @param {Object} id - The ID of the picked entity
     */
    handleFeatureWithProperties( id ) {       
        
        this.store.postalcode = id.properties.posno;
        this.store.nameOfZone = id.properties.nimi;
        this.removeEntityByName( 'coldpoint' );
        this.removeEntityByName( 'currentLocation' );
        this.datasourceService.removeDataSourcesByNamePrefix( 'TravelLabel' );
    
        //If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
        if ( this.store.postalcode ) {
            
            this.handlePostalCodeFeature( this.store.postalcode, id );
    
        }
    
        if ( id.properties.asukkaita ) {
    

            const boundingBox = this.getBoundingBox(id);

            // Construct the URL for the WFS request with the bounding box
            if (boundingBox) {
                const bboxString = `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`;
            
                // Replace 'postinumero' parameter with 'bbox' in your WFS request URL
                const Url = `https://geo.fvh.fi/r4c/collections/hsy_buildings/items?f=json&limit=2000&bbox=${bboxString}`;
            
                console.log(Url);
                // Now you can use this URL to make your WFS request
                this.hSYBuildingService.loadHSYBuildingsWithoutCache( Url );	

            }

            //createDiagramForPopulationGrid( id.properties.index, id.properties.asukkaita );
    
        }
    
        if ( !id.properties.posno && id.entityCollection._entities._array[ 0 ]._properties._id && id.entityCollection._entities._array[ 0 ]._properties._id._value == 5879932 ) {
    
            this.traveltimeService.loadTravelTimeData( id.properties.id._value );
            this.markCurrentLocation( id );
    
        }
    
        //See if we can find building floor areas
        if ( id.properties._avgheatexposuretobuilding ) {

            const address = this.buildingService.findAddressForBuilding( id.properties );
    
            if ( id.properties._locationUnder40 ) {
    
                if ( id.properties._locationUnder40._value  ) {
                    
                    this.addColdPoint( id.properties._locationUnder40._value );
                
                }
    
            }
            
            this.handleBuildingFeature( id.properties._avgheatexposuretobuilding._value, address, id.properties._postinumero._value, id.properties.treeArea, id.properties._avgTempC );
    
        }
    
    }

    getBoundingBox( id ) {

        // Assuming `entity` is your Cesium Entity
let boundingBox = null;

if (id.polygon) {
    // Access the hierarchy of the polygon to get the positions
    const hierarchy = id.polygon.hierarchy.getValue();

    // Cesium entities may have positions defined in various ways; this example assumes a simple polygon
    if (hierarchy) {
        const positions = hierarchy.positions;

        // Convert positions to Cartographic to get longitude and latitude
        const cartographics = positions.map(position => Cesium.Cartographic.fromCartesian(position));
        
        // Find the minimum and maximum longitude and latitude
        let minLon = Number.POSITIVE_INFINITY, maxLon = Number.NEGATIVE_INFINITY;
        let minLat = Number.POSITIVE_INFINITY, maxLat = Number.NEGATIVE_INFINITY;

        cartographics.forEach(cartographic => {
            minLon = Math.min(minLon, cartographic.longitude);
            maxLon = Math.max(maxLon, cartographic.longitude);
            minLat = Math.min(minLat, cartographic.latitude);
            maxLat = Math.max(maxLat, cartographic.latitude);
        });

        // Convert back to degrees
        minLon = Cesium.Math.toDegrees(minLon);
        maxLon = Cesium.Math.toDegrees(maxLon);
        minLat = Cesium.Math.toDegrees(minLat);
        maxLat = Cesium.Math.toDegrees(maxLat);

        // Now you have the bounding box corners
        boundingBox = {
            minLon: minLon,
            maxLon: maxLon,
            minLat: minLat,
            maxLat: maxLat
        };

        id.show = false;
    }
}

return boundingBox

}

    async makeWfsRequestWithBoundingBox(boundingBox) {
        // Assuming boundingBox is {minLon, maxLon, minLat, maxLat}
        const baseUrl = "https://kartta.hsy.fi/geoserver/wfs?service=WFS";
        const params = {
            service: "WFS",
            version: "2.0.0",
            request: "GetFeature",
            typename: "asuminen_ja_maankaytto:Vaestotietoruudukko_2022",
            outputFormat: "application/json",
            srsName: "EPSG:4326",
    //        bbox: `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`
        };
    
        const url = new URL(baseUrl);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        console.log("url", url)
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }
    
    /**
     * Hides the plot container if the nature feature is clicked; otherwise, shows the plot container if the show plot toggle is checked
     * 
     * @param {string} category - The category of the picked entity
     */
    hidePlotlyIfNatureFeatureIsClicked( category ) {
    
        if ( category ) {
    
            document.getElementById( 'heatHistogramContainer' ).style.visibility = 'hidden';
    
        } else {
    
            if ( document.getElementById( "showPlotToggle" ).checked && !document.getElementById( "gridViewToggle" ).checked ) {
    
                document.getElementById( 'heatHistogramContainer' ).style.visibility = 'visible';
    
            }
    
        }
    }
}