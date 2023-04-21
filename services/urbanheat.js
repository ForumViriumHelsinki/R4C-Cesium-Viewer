/**
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { String } kayttotarkoitus code for purpose
 * @return { String } purpose of building
 */
function findKayttotarkoitusHKI( kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case '011': 
			return 'Yhden asunnon talot';
		case '012': 
			return 'Kahden asunnon talot';
		case '013': 
			return 'Muut erilliset pientalot';
		case '021': 
			return 'Rivitalot';
		case '022': 
			return 'Ketjutalot';
		case '032': 
			return 'Luhtitalot';
		case '039': 
			return 'Muut kerrostalot';			
		case '041': 
			return 'Vapaa-ajan asunnot';
		case '111': 
			return 'Myymälähallit';
		case '112': 
			return 'Liike- ja tavaratalot, kauppakeskukset';
		case '119': 
			return 'Myymälärakennukset';	
		case '121': 
			return 'Hotellit, motellit, matkustajakodit, kylpylähotellit';				
		case '123': 
			return 'Loma- lepo- ja virkistyskodit';		
		case '124': 
			return 'Vuokrattavat lomamökit ja osakkeet (liiketoiminnallisesti)';				
		case '129': 
			return 'Muut majoitusliikerakennukset';	
		case '131': 
			return 'Asuntolat, vanhusten palvelutalot, asuntolahotellit';			
		case '139': 
			return 'Muut majoitusrakennukset';				
		case '141': 
			return 'Ravintolat, ruokalat ja baarit';		
		case '151': 
			return 'Toimistorakennukset';
		case '161': 
			return 'Rautatie- ja linja-autoasemat, lento- ja satamaterminaalit';	
		case '162': 
			return 'Kulkuneuvojen suoja- ja huoltorakennukset';			
		case '163': 
			return 'Pysäköintitalot';		
		case '164': 
			return 'Tietoliikenteen rakennukset';	
		case '169': 
			return 'Muut liikenteen rakennukset';												
		case '211': 
			return 'Keskussairaalat';
		case '213': 
			return 'Muut sairaalat';
		case '214': 
			return 'Terveyskeskukset';
		case '215': 
			return 'Terveydenhoidon erityislaitokset (mm. kuntoutuslaitokset)';
		case '219': 
			return 'Muut terveydenhoitorakennukset';
		case '221': 
			return 'Vanhainkodit';
		case '222': 
			return 'Lastenkodit, koulukodit';
		case '223': 
			return 'Kehitysvammaisten hoitolaitokset';
		case '229': 
			return 'Muut huoltolaitosrakennukset';
		case '231': 
			return 'Lasten päiväkodit';
		case '239': 
			return 'Muut sosiaalitoimen rakennukset';
		case '241': 
			return 'Vankilat';	
		case '311': 
			return 'Teatterit, konsertti- ja kongressitalot, oopperat';		
		case '312': 
			return 'Elokuvateatterit';		
		case '322': 
			return 'Kirjastot';			
		case '323': 
			return 'Museot, taidegalleriat';
		case '324': 
			return 'Näyttelyhallit';	
		case '331': 
			return 'Seurain-, nuoriso- yms. talot';	
		case '341': 
			return 'Kirkot, kappelit, luostarit, rukoushuoneet';	
		case '342': 
			return 'Seurakuntatalot';				
		case '349': 
			return 'Muut uskonnollisten yhteisöjen rakennukset';	
		case '351': 
			return 'Jäähallit';
		case '352': 
			return 'Uimahallit';	
		case '353': 
			return 'Tennis-, squash- ja sulkapallohallit';	
		case '354': 
			return 'Monitoimi- ja muut urheiluhallit';	
		case '359': 
			return 'Muut urheilu- ja kuntoilurakennukset';				
		case '369': 
			return 'Muut kokoontumisrakennukset';	
		case '511': 
			return 'Peruskoulut, lukiot ja muut';
		case '521': 
			return 'Ammatilliset oppilaitokset';		
		case '531': 
			return 'Korkeakoulurakennukset';				
		case '532': 
			return 'Tutkimuslaitosrakennukset';	
		case '541': 
			return 'Järjestöjen, liittojen, työnantajien yms. opetusrakennukset';
		case '549': 
			return 'Muualla luokittelemattomat opetusrakennukset';		
		case '611': 
			return 'Voimalaitosrakennukset';		
		case '613': 
			return 'Yhdyskuntatekniikan rakennukset';				
		case '691': 
			return 'Teollisuushallit';	
		case '692': 
			return 'Teollisuus- ja pienteollisuustalot';
		case '699': 
			return 'Muut teollisuuden tuotantorakennukset';			
		case '711': 
			return 'Teollisuusvarastot';		
		case '712': 
			return 'Kauppavarastot';				
		case '719': 
			return 'Muut varastorakennukset';	
		case '721': 
			return 'Paloasemat';
		case '722': 
			return 'Väestönsuojat';	
		case '711': 
			return 'Muut palo- ja pelastustoimen rakennukset';		
		case '712': 
			return 'Navetat, sikalat, kanalat yms.';				
		case '719': 
			return 'Eläinsuojat, ravihevostallit, maneesit';	
		case '721': 
			return 'Viljankuivaamot ja viljan säilytysrakennukset, siilot';
		case '722': 
			return 'Kasvihuoneet';	
		case '729': 
			return 'Turkistarhat';		
		case '811': 
			return 'Muut maa-, metsä- ja kalatalouden rakennukset';				
		case '819': 
			return 'Saunarakennukset';	
		case '891': 
			return 'Talousrakennukset';
		case '892': 
			return 'Muut rakennukset';				
		default:
			return kayttotarkoitus;
		}
}

/**
 * Sets attributes from API data source to building data source
 * 
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
function setAttributesFromApiToBuilding ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {

		// match building based on Helsinki id
        if ( properties.id == features[ i ].properties.hki_id ) {

			if ( features[ i ].properties.avgheatexposuretobuilding ) {

				properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.distanceToUnder40 = features[ i ].properties.distancetounder40;

			}

			if ( features[ i ].properties.distancetounder40 ) {

				properties.locationUnder40 = features[ i ].properties.locationunder40;

			}

			if ( features[ i ].properties.year_of_construction ) {

				properties.year_of_construction = features[ i ].properties.year_of_construction;

			}

			if ( features[ i ].properties.measured_height ) {

				properties.measured_height = features[ i ].properties.measured_height;

			}

			if ( features[ i ].properties.roof_type ) {

				properties.roof_type = features[ i ].properties.roof_type;

			}

            properties.kayttotarkoitus = findKayttotarkoitusHKI( features[ i ].properties.c_kayttark );
			features.splice( i, 1 );
			break;
        }
    }
}

/**
 * Creates Urban Heat Exposure to buildings histogram for a postal code area
 *
 * @param { Object } urbanHeatData urban heat data of a buildings in postal code area
 */
function createUrbanHeatHistogram( urbanHeatData ) {

	let trace = {
		x: urbanHeatData,
		type: 'histogram',
		name: 'average heat exposure to building',
		marker: {
			color: 'orange',
		},
	};

	if ( showPlot ) {

        document.getElementById( "plotContainer" ).style.visibility = 'visible';
    }

	let layout = { 
		title: 'Heat exposure to buildings in ' + nameOfZone,
		bargap: 0.05, 
	};

	Plotly.newPlot( 'plotContainer', [ trace ], layout );

}

/**
 * Creates SocioEconomics histogram for a postal code area
 *
 */
function createSocioEconomicsDiagram( sosData ) {

	if ( sosData ) {
		let x = [ 'apart heat expsoure', 'sum of next 7', 'vulnerable both', 'children', 'eldery', 'size of apartments', 'level of education', 'income', 'rental rate' ];
		let y = [ sosData.apartment_heat_exposure_rank, sosData.average_vul_rank ,sosData.vulnerable_both_rank, sosData.vulnerable_children_rank, sosData.vulnerable_eldery_rank, sosData.apart_size_rank, sosData.educ_rank, sosData.income_rank, sosData.rental_rate_rank ]
		let text = [ 84 - sosData.apartment_heat_exposure_rank, 84 - sosData.average_vul_rank, 84 - sosData.vulnerable_both_rank, 84 - sosData.vulnerable_children_rank, 84 - sosData.vulnerable_eldery_rank, 84 - sosData.apart_size_rank, 84 - sosData.educ_rank, 84 - sosData.income_rank, 85 - sosData.rental_rate_rank ];

		let data = [
			{
				x: x,
				y: y,
				text: text,
				type: 'bar',
			}
		];
	
		if ( showPlot ) {
	
			document.getElementById( "plotSoSContainer" ).style.visibility = 'visible';
		}
	
		let layout = { 
			yaxis: {
				visible: false, 
				showticklabels: false
			},
			title: 'Vulnerability ranks (max=83) in ' + nameOfZone,
		};
	
		Plotly.newPlot( 'plotSoSContainer',  data, layout, { staticPlot: true } );
	}

}

/**
 * Calculate average Urban Heat exposure to buildings in postal code area
 *
 * @param { Object } features buildings in postal code area
 */
function calculateAverageExposure( features ) {

	let count = 0;
	let total = 0;
	let urbanHeatData = [ ];
	let urbanHeatDataAndMaterial = [ ];


	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding ) {

			total = total + features[ i ].properties.avgheatexposuretobuilding;
			count++;
			urbanHeatData.push( features[ i ].properties.avgheatexposuretobuilding );
			let element = { heat: features[ i ].properties.avgheatexposuretobuilding, facade: features[ i ].properties.c_julkisivu, material: features[ i ].properties.c_rakeaine };
			urbanHeatDataAndMaterial.push( element );

		}

	}

	if ( count != 0 ) {

		averageHeatExposure = total / count;
		createUrbanHeatHistogram( urbanHeatData );
	//	createScatterPlot( urbanHeatDataAndMaterial );

	}
}

function findSocioEconomicsData( postcode ) {

	const response = fetch( "https://geo.fvh.fi/r4c/collections/heat_vulnerable_demographic/items?f=json&limit=1&postinumero=" + postcode )
	.then( function( response ) {
		return response.json();
	})
	.then( function( data ) {
			
		createSocioEconomicsDiagram( data.features[ 0 ].properties );
	
	})
	
}

function findUrbanHeatData( data, inhelsinki, postcode ) {

	if ( inhelsinki ) {

		const urbanheatdata = fetch( "https://geo.fvh.fi/r4c/collections/urban_heat_building/items?f=json&limit=2000&postinumero=" + postcode )
		.then( function( response ) {
			return response.json();
		  })
		.then( function( urbanheat ) {
	
			for ( let i = 0; i < data.features.length; i++ ) {
	
				let feature = data.features[ i ];
                setAttributesFromApiToBuilding( feature.properties, urbanheat.features );

			}

			addMissingHeatData( data.features, urbanheat.features  );
			calculateAverageExposure( data.features );
			addBuildingsDataSource( data, inhelsinki );

		//	return response.json();
		  }).catch(
			( e ) => {
	
				console.log( 'something went wrong', e );
	
			}
		);

	} else {

		addBuildingsDataSource( data, inhelsinki );

	}

	if ( postcode != '00230' ) {

		findSocioEconomicsData( postcode );

	}

}

function addMissingHeatData( features, heat ) {

	for ( let i = 0; i < heat.length; i++ ) {
	
		features.push( heat[ i ] );

	}

	let count = 0;


	for ( let i = 0; i < features.length; i++ ) {

		if ( Number( features[ i ].properties.c_kayttark ) < 40 ) {
			count++;
		}
	
	}

}

function filterMaterial2( facade, material, features ) {

	let heatList = [ ];

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].facade == facade && features[ i ].material == material ) {

			console.log("facade", facade)
			console.log("material", material)

			heatList.push( features[ i ].heat )
		}
	
	}
	
	if ( heatList.length == 0 ) {

		heatList.push( 0 );
	}

	return heatList;

}

function filterMaterial( facade, features, material ) {

	let heatList = [ ];
	let materialList = [ ];
	let average = 0;
	let sum = 0;

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].facade == facade  ) {

			heatList.push( features[ i ].heat );
			materialList.push( material );
			sum = sum + features[ i ].heat;

		}
	
	}
	
	if ( heatList.length == 0 ) {

		heatList.push( 0 );
		materialList.push( material );

	} else {
		
		average = sum / heatList.length;

	}

	return [ heatList, materialList, average ];

}

function createScatterPlot( features ) {

	console.log("featres", features )

	const concreteData = filterMaterial( "1", features, 'Concrete' );

	const concrete = {
		x: concreteData[ 1 ],
		y: concreteData[ 0 ],
		name: concreteData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };

	  const brickData = filterMaterial( "2", features, 'Brick' );

	  const brick = {
		x: brickData[ 1 ],
		y: brickData[ 0 ],
		name:  brickData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };

	  const metalData = filterMaterial( "3", features, 'Metal' );
	  
	  const metal = {
		x: metalData[ 1 ],
		y: metalData[ 0 ],
		name: metalData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };

	  const stoneData = filterMaterial( "4", features, 'Stone' );

	  const stone = {
		x: stoneData[ 1 ],
		y: stoneData[ 0 ],
		name: stoneData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };

	  const woodData = filterMaterial( "5", features, 'Wood' );

	  const wood = {
		x: woodData[ 1 ],
		y: woodData[ 0 ],
		name: woodData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };
	
	  const glassData = filterMaterial( "6", features, 'Glass' );

	  const glass = {
		x: glassData[ 1 ],
		y: glassData[ 0 ],
		name: glassData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };

	  const otherData = filterMaterial( "7", features, 'Other' );

	  const other = {
		x: otherData[ 1 ],
		y: otherData[ 0 ],
		name: otherData[ 2 ].toFixed( 2 ),
		type: 'scatter',
		mode: 'markers'
	  };
	  
	  
	  const data = [ concrete, brick, metal, stone, wood, glass, other ];

	  console.log( "data", data );
	  
	  const layout = {
		scattermode: 'group',
		title: 'Facade Material',
	  };
	  
	  Plotly.newPlot('plotMaterialContainer', data, layout);

}

function createScatterPlot2( features ) {

	console.log("featres", features )

	const concrete = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "1", "1" , features ), filterMaterial( "1", "2" , features ), filterMaterial( "1", "3" , features ), filterMaterial( "1", "4" , features ), filterMaterial( "1", "5" , features ), filterMaterial( "1", "undefined" , features ) ],
		name: 'Concrete',
		type: 'scatter',
		mode: 'markers'
	  };
	  
	  const brick = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "2", "1" , features ), filterMaterial( "2", "2" , features ), filterMaterial( "2", "3" , features ), filterMaterial( "2", "4" , features ), filterMaterial( "2", "5" , features ), filterMaterial( "2", "undefined" , features ) ],
		name: 'Brick',
		type: 'scatter',
		mode: 'markers'
	  };
	  
	  
	  const metal = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "3", "1" , features ), filterMaterial( "3", "2" , features ), filterMaterial( "3", "3" , features ), filterMaterial( "3", "4" , features ), filterMaterial( "3", "5" , features ), filterMaterial( "3", "undefined" , features ) ],
		name: 'Metal',
		type: 'scatter',
		mode: 'markers'
	  };

	  const stone = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "4", "1" , features ), filterMaterial( "4", "2" , features ), filterMaterial( "4", "3" , features ), filterMaterial( "4", "4" , features ), filterMaterial( "4", "5" , features ), filterMaterial( "4", "undefined" , features ) ],
		name: 'Stone',
		type: 'scatter',
		mode: 'markers'
	  };
	  
	  

	  const wood = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "5", "1" , features ), filterMaterial( "5", "2" , features ), filterMaterial( "5", "3" , features ), filterMaterial( "5", "4" , features ), filterMaterial( "5", "5" , features ), filterMaterial( "5", "undefined" , features ) ],
		name: 'Wood',
		type: 'scatter',
		mode: 'markers'
	  };
	
	  const glass = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "6", "1" , features ), filterMaterial( "6", "2" , features ), filterMaterial( "6", "3" , features ), filterMaterial( "6", "4" , features ), filterMaterial( "6", "5" , features ), filterMaterial( "6", "6" , features ) ],
		name: 'Glass',
		type: 'scatter',
		mode: 'markers'
	  };


	  const other = {
		x: ['Concrete', 'Brick', 'Steel', 'Wood', 'other', 'n/a' ],
		y: [ filterMaterial( "7", "1" , features ), filterMaterial( "7", "2" , features ), filterMaterial( "7", "3" , features ), filterMaterial( "7", "4" , features ), filterMaterial( "7", "5" , features ), filterMaterial( "7", "6" , features ) ],
		name: 'Other',
		type: 'scatter',
		mode: 'markers'
	  };
	  
	  
	  const data = [ concrete, brick, metal, stone, wood, glass, other ];

	  console.log( "data", data );
	  
	  const layout = {
		scattermode: 'group',
		title: 'Grouped by Material',
		xaxis: { title: 'Facade Material' },
	  };
	  
	  Plotly.newPlot('plotMaterialContainer', data, layout);

}