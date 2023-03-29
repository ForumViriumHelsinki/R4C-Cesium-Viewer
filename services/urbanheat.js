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
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { Object } properties of a building
 * @param { Object } features Urban Heat Exposure buildings dataset
 */
function setKayttoKayttotarkoitusAndAverageHeatExposureToBuilding ( properties, features ) {

    for ( let i = 0; i < features.length; i++ ) {

		// match building based on Helsinki id
        if ( properties.id == features[ i ].properties.hki_id ) {

            properties.avgheatexposuretobuilding = features[ i ].properties.avgheatexposuretobuilding;
			properties.distanceToUnder40 = features[ i ].properties.distancetounder40;
			properties.locationUnder40 = features[ i ].properties.locationunder40;
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
		let x = [ 'apart heat expsoure', 'sum of next 6', 'vulnerable both', 'children', 'eldery', 'size of apartments', 'level of education', 'income' ];
		let y = [ sosData.apartment_heat_exposure_rank, sosData.average_vul_rank ,sosData.vulnerable_both_rank, sosData.vulnerable_children_rank, sosData.vulnerable_eldery_rank, sosData.apart_size_rank, sosData.educ_rank, sosData.income_rank ]
		let text = [ 84 - sosData.apartment_heat_exposure_rank, 84 - sosData.average_vul_rank, 84 - sosData.vulnerable_both_rank, 84 - sosData.vulnerable_children_rank, 84 - sosData.vulnerable_eldery_rank, 84 - sosData.apart_size_rank, 84 - sosData.educ_rank, 84 - sosData.income_rank ];

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
			title: 'Vulnerability ranks (max=83) in ' + nameOfZone,
		};
	
		Plotly.newPlot( 'plotSoSContainer',  data, layout );
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

	for ( let i = 0; i < features.length; i++ ) {

		if ( features[ i ].properties.avgheatexposuretobuilding ) {

			total = total + features[ i ].properties.avgheatexposuretobuilding;
			count++;
			urbanHeatData.push( features[ i ].properties.avgheatexposuretobuilding );

		}

	}

	if ( count != 0 ) {

		averageHeatExposure = total / count;
		createUrbanHeatHistogram( urbanHeatData );
		
		const response = fetch( 'assets/data/stats_po_uh.json' )
		.then( function( response ) {
		  return response.json();
		})
		.then( function( data ) {
			for ( let i = 0; i < data.features.length; i++ ) {

				if ( data.features[ i ].properties.postinumeroalue == postalcode ) {
	
					createSocioEconomicsDiagram( data.features[ i ].properties );
					break;
	
				}
			}
		})

	}
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
                setKayttoKayttotarkoitusAndAverageHeatExposureToBuilding( feature.properties, urbanheat.features );

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