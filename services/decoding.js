/**
 * Finds the purpose of a building in Helsinki based on code included in wfs source data
 * Code list: https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf
 *
 * @param { String } kayttotarkoitus code for purpose
 * @return { String } purpose of building
 */
function decodeKayttotarkoitusHKI( kayttotarkoitus ) {

	switch ( kayttotarkoitus ) {
		case '011': 
			return 'Yhden asunnon talot';
		case '012': 
			return 'Kahden asunnon talot';
		case '013': 
			return 'Muut pientalot';
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
			return 'Liike- ja tavaratalot';
		case '119': 
			return 'Myymälärakennukset';	
		case '121': 
			return 'Hotellit';				
		case '123': 
			return 'Loma- lepo- ja virkistyskodit';		
		case '124': 
			return 'Vuokrattavat lomamökit';				
		case '129': 
			return 'Muu majoitusliike';	
		case '131': 
			return 'Asuntolat, vanhusten yms';			
		case '139': 
			return 'Muut majoitusrakennukset';				
		case '141': 
			return 'Ravintolat, baarit yms';		
		case '151': 
			return 'Toimistorakennukset';
		case '161': 
			return 'Asemat ja terminaalit';	
		case '162': 
			return 'Kulkuneuvojen rakennukset';			
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
			return 'Erityis terveydenhoito';
		case '219': 
			return 'Muu terveydenhoito';
		case '221': 
			return 'Vanhainkodit';
		case '222': 
			return 'Lastenkodit, koulukodit';
		case '223': 
			return 'Kehitysvammaisten hoito';
		case '229': 
			return 'Muut huoltolaitokset';
		case '231': 
			return 'Lasten päiväkodit';
		case '239': 
			return 'Muut sosiaalitoimi';
		case '241': 
			return 'Vankilat';	
		case '311': 
			return 'Teatterit, konsertti yms';		
		case '312': 
			return 'Elokuvateatterit';		
		case '322': 
			return 'Kirjastot';			
		case '323': 
			return 'Museot, taidegalleriat';
		case '324': 
			return 'Näyttelyhallit';	
		case '331': 
			return 'Seurain-, nuoriso- yms';	
		case '341': 
			return 'Kirkot, kappelit yms';	
		case '342': 
			return 'Seurakuntatalot';				
		case '349': 
			return 'Muut uskonnolliset yhteisöt';	
		case '351': 
			return 'Jäähallit';
		case '352': 
			return 'Uimahallit';	
		case '353': 
			return 'Tennis, squash yms';	
		case '354': 
			return 'Monitoimi/urheiluhallit';	
		case '359': 
			return 'Muut urheilu';				
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
			return 'Järjestöjen opetus';
		case '549': 
			return 'Muut opetusrakennukset';		
		case '611': 
			return 'Voimalaitosrakennukset';		
		case '613': 
			return 'Yhdyskuntatekniikka';				
		case '691': 
			return 'Teollisuushallit';	
		case '692': 
			return 'Teollisuus- ja pienteollisuus';
		case '699': 
			return 'Muut teollisuus/tuotanto';			
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
		case '729': 
			return 'Muu palo- ja pelastustoiminta';		
		case '811': 
			return 'Navetat, sikalat, kanalat yms';				
		case '819': 
			return 'Eläinsuojat';	
		case '891': 
			return 'Viljarakennukset';
		case '892': 
			return 'Kasvihuoneet';	
		case '893': 
			return 'Turkistarhat';		
		case '899': 
			return 'Muu maa/metsä/kala';						
		case '931': 
			return 'Saunarakennukset';	
		case '941': 
			return 'Talousrakennukset';				
		default:
			return kayttotarkoitus;
		}

}


/**
 * Decodes building material https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf
 *
 * @param { String } material value code for building material.'
 * @return { String } building material
 */
function decodeMaterial( material ) {

	switch ( material ) {
		case '1': 
			return 'concrete';
		case '2': 
			return 'brick';
		case '3': 
			return 'steel';
		case '4': 
			return 'wood';
		case '5': 
			return 'other';
		default:
			return material;  		
	}

}

function decodeHeatingMethod( heatingMethod ) {

	switch ( heatingMethod ) {
		case '1': 
			return 'central water';
		case '2': 
			return 'central air';
		case '3': 
			return 'electricity';
        case '4': 
			return 'oven';
		case '5': 
			return 'no fixed heating';			
        default:
            return heatingMethod;  
	}

}

function decodeHeatingSource( heatingSource ) {

	switch ( heatingSource ) {
		case '1': 
			return 'district';
		case '2': 
			return 'light fuel oil';
		case '3': 
			return 'heavy fuel oil';
        case '4': 
			return 'electricity';
		case '5': 
			return 'gas';		
		case '6': 
			return 'coal';
		case '7': 
			return 'wood';
		case '8': 
			return 'peat';
        case '9': 
			return 'ground-source';
		case '10': 
			return 'other';					
        default:
            return heatingSource;  
	}

}

/**
 * Decodes facade material https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf
 *
 * @param { String } facade value code for facade material.'
 * @return { String } face material
 */
function decodeFacade( facade ) {

	switch ( facade ) {
		case '1': 
			return 'concrete';
		case '2': 
			return 'brick';
		case '3': 
			return 'metal';
		case '4': 
			return 'stone';
		case '5': 
			return 'wood';
		case '6': 
			return 'glass';
		case '7': 
			return 'other';
		default:
			return facade;  				
	}

}