console.log("GeoAPITools.js loaded!");

// Resets the objects displayed and camera orientation
function reset() {
	    // Fly the camera to Helsinki at the given longitude, latitude, and height.
    viewer.camera.flyTo({
      destination : Cesium.Cartesian3.fromDegrees(24.941745, 60.165464, 35000), 
      orientation : {
        heading : Cesium.Math.toRadians(0.0),
        pitch : Cesium.Math.toRadians(-85.0),
      }
    });

	viewer.dataSources.removeAll();
	viewer.entities.removeAll();

    // Load post code zones & energy availability tags
	loadPostCodeZones(0.2);
	// loadEnergyAvailabilityAPI();
	
	document.getElementById('plotContainer').style.visibility='hidden';
	
	autoZoom = true;
  	showPlot = true;
	plotDaily = true;
	showNature = false;
	plotEnergy = true;
	print = true;
	
	lastEnergyPlotRATU = 0;
	

	document.getElementById("showPlotToggle").checked = true;
	document.getElementById("autoZoomToggle").checked = true;
	document.getElementById("plotDailyToggle").checked = true;
	document.getElementById("showNatureToggle").checked = false;
	document.getElementById("show3DCMToggle").checked = false;
	document.getElementById("printToggle").checked = true;
	
	document.getElementById('printContainer').innerHTML =  "<i>Please click on a postcode area to load building and lot polygons from the WFS server...</i>";
	
	tilesets.forEach(function (tileset){
		tileset.show = false;
	});

}

function loadHKIWFSLots(postcode) {
	const HKILotURL = "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata:Kaavayksikot&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326&CQL_FILTER=osoite%20LIKE%20%27%25" + postcode + "%25%27"
	console.log("Loading: " + HKILotURL);
	
	var promiseFeaturesAPI = Cesium.GeoJsonDataSource.load(HKILotURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color(0.3, 0.3, 0.3, 0.2),
  		strokeWidth: 3,
		height: 0
	})
	.then(function (dataSource) {
		viewer.dataSources.add(dataSource);
		dataSource.name = 'HKI Lots';
		var entities = dataSource.entities.values;
		for (var i = 0; i < entities.length; i++) {
			var entity = entities[i];

			if (entity.properties._rakennusoikeus._value == null) {
				entity.polygon.material = new Cesium.Color(0.3, 0.3, 0.3, 0.5);
            } else {
            	entity.polygon.material = new Cesium.Color(0.2, 0.6, 0.2, 0.5);
            }	
		}
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}

function loadWFSNatureAreas( postcode ) {
	//postcode is expexted to be string!

	let url;
	
	url = "https://geo.fvh.fi/r4c/collections/uusimaa_nature_area/items?f=json&limit=10000&postinumeroalue=" + postcode ;

	console.log("Loading: " + url );
	
	let promiseFeaturesAPI = Cesium.GeoJsonDataSource.load( url, {
  		stroke: Cesium.Color.BLACK,
  		fill: Cesium.Color.DARKGREEN,
  		strokeWidth: 3,
		clampToGround: true
	})
	.then(function ( dataSource ) {

		viewer.dataSources.add( dataSource );
		dataSource.name = "NatureAreas";
		let entities = dataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {

			let entity = entities[ i ];
			const category = entity.properties._category._value;

			if ( category ) {

				setNatureAreaPolygonMaterialColor( entity, category )
			}

		}
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}

function setNatureAreaPolygonMaterialColor( entity, category ) {
			 						
	switch ( category ){
		case "jarvi":
			entity.polygon.material = Cesium.Color.DEEPSKYBLUE;
			break;
		case "suo":
			entity.polygon.material = Cesium.Color.DARKOLIVEGREEN;
			break;
		case "matalikko":
			entity.polygon.material = new Cesium.Color( 138, 241, 254, 1 ); 
			break;
		case "puisto":
			entity.polygon.material = Cesium.Color.LIGHTGREEN;
			break;
		case "vesikivikko":
			entity.polygon.material = Cesium.Color.LIGHTSTEELBLUE;
			break;
		case "niitty":
			entity.polygon.material = Cesium.Color.YELLOWGREEN;
			break;
		case "luonnonsuojelualue": 
			entity.polygon.material = Cesium.Color.DARKGREEN;
			break;	
		case "hietikko":
			entity.polygon.material = Cesium.Color.BURLYWOOD;
			break;
		case "kallioalue": 
			entity.polygon.material = Cesium.Color.DARKGREY;
			break;	
		case "maatuvavesialue": 
			entity.polygon.material = Cesium.Color.DARKKHAKI;
			break;	
		case "kivikko": 
			entity.polygon.material = Cesium.Color.GREY;
			break;	
		case "suojaalue": 
			entity.polygon.material = new Cesium.Color( 0, 100, 0, 0.2 );
			break;
		case "soistuma": 
			entity.polygon.material = Cesium.Color.DARKSEAGREEN;
			break;	
		case "meri": 
			entity.polygon.material = Cesium.Color.DODGERBLUE;
			break;
		case "luonnonpuisto": 
			entity.polygon.material = Cesium.Color.LIMEGREEN;
			break;
		case "kansallispuisto": 
			entity.polygon.material = Cesium.Color.FORESTGREEN;
			break;
		case "tulvaalue": 
			entity.polygon.material = Cesium.Color.PURPLE;
			break;	
		case "virtavesialue": 
			entity.polygon.material = Cesium.Color.CYAN;
			break;																																			
		default:
			entity.polygon.material = Cesium.Color.DARKGREEN;
		}	

}

function setBuildingPolygonMaterialColor( entity, kayttotarkoitus ) {

	switch ( kayttotarkoitus ){
		case 2: // business
			entity.polygon.material = Cesium.Color.TOMATO;
			break;
		case 3: // holiday/cottage
			entity.polygon.material = Cesium.Color.YELLOW;
			break;
		case 4: // factory/production
			entity.polygon.material = Cesium.Color.BLACK; 
			break;
		case 5: // religous buildings
			entity.polygon.material = Cesium.Color.MEDIUMPURPLE;
			break;
		case 6: // open areas with roof, for example for parking cars and trash
			entity.polygon.material = Cesium.Color.MEDIUMAQUAMARINE;
			break;
		case 8: // // churches
			entity.polygon.material = Cesium.Color.HOTPINK;
			break;
		default: // residential
			entity.polygon.material = Cesium.Color.MIDNIGHTBLUE;
		}

}

function findMultiplierForFloorCount( kayttotarkoitus ) {

	switch ( kayttotarkoitus ){
		case 2: // business
			return 4.0;
		case 3: // holiday/cottage
			return 2.0;
		case 4: // factory/production
			return 5.4;
		case 5: // religous buildings
			return 4.0;
		case 6: // open areas with roof, for example for parking cars and trash
			return 3.0;
		case 8: // // churches
			return 8.1;
		default: // residential
			return 2.7 
		}

}

function loadWFSBuildings( postcode ) {
	//postcode is expexted to be string!

	var HKIBuildingURL;

	console.log( "postal code", Number( postcode ) )

	let inhelsinki = false;

	if ( Number(postcode) < 1000 ) {
		
		HKIBuildingURL = "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27" + postcode + "%27";
		inhelsinki = true;

	} else {

		HKIBuildingURL = "https://geo.fvh.fi/r4c/collections/uusimaa_building/items?f=json&limit=10000&postinumeroalue=" + postcode;

	}
	
	console.log("Loading: " + HKIBuildingURL );
	
	var promiseFeaturesAPI = Cesium.GeoJsonDataSource.load( HKIBuildingURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: Cesium.Color.CRIMSON,
  		strokeWidth: 3,
		clampToGround: true
	})
	.then(function ( dataSource ) {
		viewer.dataSources.add( dataSource );
		var entities = dataSource.entities.values;

		if ( !inhelsinki ) {

			for ( let i = 0; i < entities.length; i++ ) {

				let entity = entities[ i ];
				const kayttotarkoitus = Number( entity.properties._kayttotarkoitus._value );
				const multiplier = findMultiplierForFloorCount( kayttotarkoitus )

				if ( entity.properties.kerrosluku != null ) {

					entity.polygon.extrudedHeight = entity.properties.kerrosluku._value * multiplier;

				}

				if ( kayttotarkoitus ) {

					setBuildingPolygonMaterialColor( entity, kayttotarkoitus );

				}	
				
			}
		}	
	})	
	.otherwise(function ( error ) {
      //Display any errrors encountered while loading.
      console.log( error );
    });
}

// Loads postal code zone polygons, opacity given as float from 0 - 1
function loadPostCodeZones(opacity) {
    // Load postal code zones
    const HKIPostCodesURL = 'uusimaa_po.json';
	console.log("Loading: " + HKIPostCodesURL);
	
	var promisePostCodes = Cesium.GeoJsonDataSource.load(HKIPostCodesURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color(0.3, 0.3, 0.3, opacity),
  		strokeWidth: 5,
		clampToGround: false
	})
	.then(function (dataSource) {
		viewer.dataSources.add(dataSource);
		var entities = dataSource.entities.values;
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}

// Loads seutuRAMAVA polygons from OGC API Features for the given postcode.
function loadSeutuRAMAVA(tunnus) {
	//This looks silly, but is here to go from "00930" to "930"...
	postcode = toString(parseInt(tunnus));
	
	const HKILotURL = 'https://geo.fvh.fi/features/collections/hki_lot_reserve/items?f=json&lang=en-US&tunnus=' + tunnus + '&limit=1000';
	console.log("Loading: " + HKILotURL);
	
	var promiseFeaturesAPI = Cesium.GeoJsonDataSource.load(HKILotURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color(0.3, 0.3, 0.3, 0.5),
  		strokeWidth: 3,
		clampToGround: true
	})
	.then(function (dataSource) {
		viewer.dataSources.add(dataSource);
		dataSource.name = 'SeutuRAMAVA';
		var entities = dataSource.entities.values;
		
		for (var i = 0; i < entities.length; i++) {
			
			
			var entity = entities[i];

			if (entity.properties.laskvar_yh._value == 0) {
				entity.polygon.material = new Cesium.Color(0.3, 0.3, 0.3, 0.5);
            } else {
            	entity.polygon.material = new Cesium.Color(0.2, 0.6, 0.2, 0.5);
            }	
		}
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}
// Load modified SeutuRAMAVA polygons from OGC API Features
// loadSeutuRAMAVA("47");

//Loads the energy time series for a given building defined with the RATU building identifier
function loadEnergyTimeSeries(ratu) { 
	
	//const EnergyURL = 'https://geo.fvh.fi/features/collections/haso_district_heating_jan_mar/items?f=json&lang=en-US&ratu='+ ratu +'&limit=1000';
	const EnergyURL = 'https://geo.fvh.fi/timeseries/collections/haso_district_heating_daily/items?f=json&lang=en-US&ratu='+ ratu +'&limit=1000';
	
	console.log("Loading: " + EnergyURL);
	
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
    	if (this.readyState == 4 && this.status == 200) {
       		// Typical action to be performed when the document is ready:
       		var energyData = JSON.parse(xhttp.responseText);
			
			if (energyData.features.length != 0)
			{
				console.log("Energy data found!");
				lastEnergyPlotRATU = ratu;
				
				var valueSeries = [];
				var timeStampSeries = [];+
				
				//Sort...
				energyData.features.sort( function ( a, b ) {
        			return a.properties.day.localeCompare( b.properties.day );
    			});
				
				if (plotDaily == false) {
					//This gets the hourly data, too much for must use cases...
					energyData.features.forEach(function(currentValue) {
						currentValue.properties.timeseries.forEach(function(currentTimePoint) {
							valueSeries.push(parseFloat(currentTimePoint.quantity));
							let timeStamp = currentTimePoint.time.replace("T"," ");
							timeStamp = timeStamp.replace("Z","");
							timeStampSeries.push(timeStamp);
						})
					});
				}
				
				//This gets one value point for each day, thus downsampling the time series...
				if (plotDaily == true) {
					//This gets the daily data, too much for must use cases...
					energyData.features.forEach(function(currentValue) {
						var dailyQuantity = 0;
						currentValue.properties.timeseries.forEach(function(currentTimePoint) {
							dailyQuantity = dailyQuantity + parseFloat(currentTimePoint.quantity);
						})
						valueSeries.push(dailyQuantity);
						let timeStamp = currentValue.properties.timeseries[0].time.replace("T"," ");
						timeStamp = timeStamp.replace("Z","");
						timeStampSeries.push(timeStamp);
					});
				}
				
				
				//Display plot
				if (showPlot == true) {
				document.getElementById("plotContainer").style.visibility = 'visible';
				}
				
				var data = [
  				{
   			 		y: valueSeries,
    				x: timeStampSeries,
					type: 'scatter'
				}];
			
				//Test plotting
			
				if (plotDaily == true) {
				var layout = {
  					title: {
    					text:'Lämmitysenergia vuorokaudessa (MWh)'
				}};
				} else {
				var layout = {
  					title: {
    					text:'Lämmitysenergia tunnissa (MWh)'
				}};					
				}
				
				Plotly.newPlot('plotContainer', data, layout);
			}	
			
    	}
	};
	xhttp.open("GET", EnergyURL, true);
	xhttp.send();
}

//Checks the availabity of energy data for a given post code zone. This version relies on a static JSON file to provide this.
function loadEnergyAvailability(postcode) {
	const EnergyAvailabilityListURL = 'EnergyAvailability.json';
	
	var promiseEnergyList = Cesium.GeoJsonDataSource.load(EnergyAvailabilityListURL, {
  		markerColor: Cesium.Color.RED,
  		strokeWidth: 3,
  		markerSymbol: 'marker-stroked'
	})
	.then(function (dataSource) {
		viewer.dataSources.add(dataSource);
		if (postcode != null) {
			console.log("Energy tags requested for: " + postcode);
			
			var entities = dataSource.entities.values;
			entities.forEach(function(item) {
				if (item.properties.tunnus != postcode) {
					item.show = false;
				}
			})
		}
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}


//Checks the availabity of energy data for a given post code zone. This version relies on OGC API Features to provide this.
function loadEnergyAvailabilityAPI(postcode) {
	
	console.log("Getting data for " + postcode);
	
	//Assemble query string...
	const EnergyAvailabilityListURL = "https://geo.fvh.fi/features/collections/haso_district_heating_check/items?f=json&limit=1000";
	console.log(EnergyAvailabilityListURL);
	
	fetch(EnergyAvailabilityListURL)
		.then(response => response.json())
		.then(data => {
			if (postcode == null) {	
			data.features.forEach(function (item, index, arr){
				if(item.properties.id != undefined)	{
					
					var cpoint = findEntityCenter(item);
					var energyPoint = viewer.entities.add({
    					name : String(item.properties.id),
    					position : Cesium.Cartesian3.fromDegrees(cpoint[0],cpoint[1]),
    					point : {
        					pixelSize : 5,
        					color : Cesium.Color.RED,
        					outlineColor : Cesium.Color.WHITE,
        					outlineWidth : 2,
							distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, 300000.0)
    						},
						label : {
        					text : item.properties.osoite,
        					font : '12pt monospace',
        					style: Cesium.LabelStyle.FILL_AND_OUTLINE,
       						outlineWidth : 2,
							showBackground : true,
							backgroundColor : Cesium.Color.WHITE,
							//outlineColor : Cesium.Color.RED,
							fillColor: Cesium.Color.BLACK,
        					verticalOrigin : Cesium.VerticalOrigin.CENTER,
							horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
        					pixelOffset : new Cesium.Cartesian2(10, 0),
							disableDepthTestDistance : Number.POSITIVE_INFINITY,
							translucencyByDistance : new Cesium.NearFarScalar(500, 1.0, 1500, 0.0)
    					}
						});
					}
				}); 
			} else {
			data.features.forEach(function (item, index, arr){
				if(item.properties.id != undefined){
					if(item.properties.osoite.includes(postcode)) {
					var cpoint = findEntityTopRight(item);
					
					var energyPoint = viewer.entities.add({
    					name : String(item.properties.id),
    					position : Cesium.Cartesian3.fromDegrees(cpoint[0],cpoint[1]),
						label : {
        					text : item.properties.osoite,
        					font : '12pt monospace',
        					style: Cesium.LabelStyle.FILL_AND_OUTLINE,
       						outlineWidth : 2,
							showBackground : true,
							backgroundColor : Cesium.Color.WHITE,
							//outlineColor : Cesium.Color.RED,
							fillColor: Cesium.Color.BLACK,
        					verticalOrigin : Cesium.VerticalOrigin.CENTER,
							horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
        					pixelOffset : new Cesium.Cartesian2(10, 0),
							disableDepthTestDistance : Number.POSITIVE_INFINITY,
							translucencyByDistance : new Cesium.NearFarScalar(500, 1.0, 1500, 0.0)
    					}
					});

					const polygon = item.geometry.coordinates[0];
					var polygonDissassembled = [];
					polygon.forEach(function(item) {
						polygonDissassembled.push(item[0]);
						polygonDissassembled.push(item[1]);
					});
					
					const redPolygon = viewer.entities.add({
  						name: "Building with energy data",
  						polygon: {
    					hierarchy: Cesium.Cartesian3.fromDegreesArray(polygonDissassembled),
    					material: Cesium.Color.WHITE,
						outline: true,
						outlineColor: Cesium.Color.RED,
						outlineWidth: 5,
						height: 0,
						zIndex: 1000
  						}
					});
					
					//Also adding a point, to support visualization
					var cpoint = findEntityCenter(item);
					var energyPoint = viewer.entities.add({
    					name : String(item.properties.id),
    					position : Cesium.Cartesian3.fromDegrees(cpoint[0],cpoint[1]),
    					point : {
        					pixelSize : 5,
        					color : Cesium.Color.RED,
        					outlineColor : Cesium.Color.WHITE,
        					outlineWidth : 2,
							disableDepthTestDistance : Number.POSITIVE_INFINITY,
							distanceDisplayCondition : new Cesium.DistanceDisplayCondition(400.0, 30000.0)
    						}
						});	
					}
				}
			});
		}
	});
}


function loadHKIBuildings(postcode) {
	const HKIBuildingURL = 'https://geo.fvh.fi/features/collections/hki_buildings/items?f=json&lang=en-US&postinumero='+ postcode +'&limit=1000';
	console.log("Loading: " + HKIBuildingURL);
	
	var promiseFeaturesAPI = Cesium.GeoJsonDataSource.load(HKIBuildingURL, {
  		stroke: Cesium.Color.BLACK,
  		fill: new Cesium.Color(0.9, 0.9, 0.9, 1),
  		strokeWidth: 3,
		clampToGround: true
	})
	.then(function (dataSource) {
		viewer.dataSources.add(dataSource);
		dataSource.name = "Buildings";
		var entities = dataSource.entities.values;
		
			var Betoni = 0;
			var Tiili = 0;
			var Metallilevy = 0;
			var Kivi = 0;
			var Puu = 0;
			var Lasi = 0;
			var Muu = 0;
		
		for (var i = 0; i < entities.length; i++) {
			
			var entity = entities[i];
			
			// Extrude according to floor count
			if (entity.properties.i_kerrlkm != null) {
				entity.polygon.extrudedHeight = entity.properties.i_kerrlkm._value * 2.7;
			}
			
			// Color according to facade material
			
			switch (entity.properties.c_julkisivu._value){
			case '1':
				entity.polygon.material = new Cesium.Color(0.7, 0.7, 0.7, 1);
				Betoni++;
				break;
			case '2':
				entity.polygon.material = new Cesium.Color(0.7, 0.5, 0.5, 1);
				Tiili++;
				break;
			case '3':
				entity.polygon.material = new Cesium.Color(0.4, 0.4, 0.4, 1);
				Metallilevy++;
				break;
			case '4':
				entity.polygon.material = new Cesium.Color(0.9, 0.9, 0.6, 1);
				Kivi++;
				break;
			case '5':
				entity.polygon.material = new Cesium.Color(0.9, 0.9, 0.7, 1);
				Puu++;
				break;
			case '6':
				entity.polygon.material = new Cesium.Color(0.6, 0.6, 0.9, 1);
				Lasi++;
				break;
			case '7':
				entity.polygon.material = new Cesium.Color(0.9, 0.9, 0.9, 1);
				Muu++;
				break;
			default:
				entity.polygon.material = new Cesium.Color(0.9, 0.9, 0.9, 1);
			}
			// RA_JULKISIVUMAT 1 Betoni
			// RA_JULKISIVUMAT 2 Tiili
			// RA_JULKISIVUMAT 3 Metallilevy
			// RA_JULKISIVUMAT 4 Kivi
			// RA_JULKISIVUMAT 5 Puu
			// RA_JULKISIVUMAT 6 Lasi
			// RA_JULKISIVUMAT 7 Muu
		}
		
		//Display plot
		if (showPlot == true) {
		document.getElementById("plotContainer").style.visibility = 'visible';
		}
		
		var data = [
  			{
   			 	x: ['Betoni', 'Tiili', 'Metallilevy','Kivi','Puu','Lasi','Muu'],
    			y: [Betoni, Tiili, Metallilevy,Kivi,Puu,Lasi,Muu],
			marker:{
    		color: ['rgba(180,180,180,1)', 'rgba(180,128,128,1)', 'rgba(102,102,102,1)', 'rgba(230,230,153,1)', 'rgba(230,230,179,1)', 'rgba(153,153,230,1)', 'rgba(230,230,230,1)'],
  			},
	type: 'bar'}];
			
			//Test plotting
			lastEnergyPlotRATU = 0;
			var layout = {
  title: {
    text:'Julkisivun materiaali postinumeroalueella'}};
		Plotly.newPlot('plotContainer', data, layout);
	})	
	.otherwise(function (error) {
      //Display any errrors encountered while loading.
      console.log(error);
    });
}
// Load building polygons from OGC API Features
// loadHKIBuildings("00930");

function findEntityCenter(element) {
	
	//Drop multipolygons to only process first polygon...
	if (element.geometry.type == "MultiPolygon") {
		console.log("Multipoly found, dropping...");
		element.geometry.coordinates[0] = element.geometry.coordinates[0][0];
	}
		
    var i = 0;

    //These hold the bounding box
    var latMIN = 0;
    var latMAX = 0;
    var lonMIN = 0;
    var lonMAX = 0;

	//viewer.dataSources._dataSources[0].entities._entities._array[0]._polygon._hierarchy._value.positions[0]
    while (i < element.geometry.coordinates[0].length) {
	
		var lat = element.geometry.coordinates[0][i][0];
		var lon = element.geometry.coordinates[0][i][1];

        //First run
        if (i == 0) {
            latMIN = lat;
            latMAX = lat;
            lonMIN = lon;
            lonMAX = lon;
        }
        
        if (lat < latMIN) {
            latMIN = lat;
        }

        if (lat > latMAX) {
            latMAX = lat;
        }

        if (lon < lonMIN) {
            lonMIN = lon;
        }

        if (lon > lonMAX) {
            lonMAX = lon;
        }
      
        i++;
    }

	//Compute bbox center
	latMID = (latMAX-latMIN)/2+latMIN;
	lonMID = (lonMAX-lonMIN)/2+lonMIN;
	
    return [latMID, lonMID];
}

function findEntityTopRight(element) {
		
	//Drop multipolygons to only process first polygon...
	if (element.geometry.type == "MultiPolygon") {
		console.log("Multipoly found, dropping...");
		element.geometry.coordinates[0] = element.geometry.coordinates[0][0];
	}
		
    var i = 0;

    //These hold the bounding box
    var latMIN = 0;
    var latMAX = 0;
    var lonMIN = 0;
    var lonMAX = 0;

	//viewer.dataSources._dataSources[0].entities._entities._array[0]._polygon._hierarchy._value.positions[0]
    while (i < element.geometry.coordinates[0].length) {
	
		var lat = element.geometry.coordinates[0][i][0];
		var lon = element.geometry.coordinates[0][i][1];

        //First run
        if (i == 0) {
            latMIN = lat;
            latMAX = lat;
            lonMIN = lon;
            lonMAX = lon;
        }
        
        if (lat < latMIN) {
            latMIN = lat;
        }

        if (lat > latMAX) {
            latMAX = lat;
        }

        if (lon < lonMIN) {
            lonMIN = lon;
        }

        if (lon > lonMAX) {
            lonMAX = lon;
        }
      
        i++;
    }

    return [latMAX, lonMAX];
}

	
function findEntityBounds(element) {
	
    var i = 0;

    //These hold the bounding box
    var latMIN = 0;
    var latMAX = 0;
    var lonMIN = 0;
    var lonMAX = 0;

	//viewer.dataSources._dataSources[0].entities._entities._array[0]._polygon._hierarchy._value.positions[0]
    while (i < element._polygon._hierarchy._value.positions.length) {

        //Assemble lat & lon from entity position
        var posDeg = Cesium.Cartographic.fromCartesian(element._polygon._hierarchy._value.positions[i]);

        //First run
        if (i == 0) {
            latMIN = posDeg.latitude;
            latMAX = posDeg.latitude;
            lonMIN = posDeg.longitude;
            lonMAX = posDeg.longitude;
        }
        
        if (posDeg.latitude < latMIN) {
            latMIN = posDeg.latitude;
        }

        if (posDeg.latitude > latMAX) {
            latMAX = posDeg.latitude;
        }

        if (posDeg.longitude < lonMIN) {
            lonMIN = posDeg.longitude;
        }

        if (posDeg.longitude > lonMAX) {
            lonMAX = posDeg.longitude;
        }
      
        i++;
    }
    return [latMIN, latMAX, lonMIN, lonMAX];
}

//Offset function for correcting heights of 3D tiles... Only used internally now, but exported for possible later use.	
function setHeightOffset(heightOffset, tileset) {
    var boundingSphere = tileset.boundingSphere;
    var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
    var surface = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
    var offset = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
    var translation = Cesium.Cartesian3.subtract(offset, surface, new Cesium.Cartesian3());
    tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
}

// Add Helsinki 3D-tiles.
    // const hkiTileSet = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
    //	url : 'https://kartta.hel.fi/3d/datasource-data/e9cfc1bb-a015-4a73-b741-7535504c61bb/tileset.json',
    //	maximumScreenSpaceError: 4
	//}));

    // Attache event listener to set height compensation for tileset after loading...
    //hkiTileSet.allTilesLoaded.addEventListener(function() {
	//	setHeightOffset(-1,hkiTileSet);
	//});