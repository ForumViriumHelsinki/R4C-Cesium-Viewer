/**
 * Decoding Service
 * Provides lookup and decoding functions for Helsinki building registry codes.
 * Converts numeric/coded values to human-readable text descriptions for:
 * - Building purposes (käyttötarkoitus)
 * - Building materials
 * - Heating methods and sources
 * - Facade materials
 * - Color normalization/mapping
 *
 * @class Decoding
 * @see {@link https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf|Building Registry Metadata}
 * @see {@link https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf|Building Material Codes}
 */
export default class Decoding {
	/**
	 * Decodes Helsinki building purpose codes to Finnish text descriptions
	 * Maps official building registry codes (e.g., '011', '131', '511') to purpose categories.
	 * Covers residential, commercial, institutional, industrial, and agricultural building types.
	 *
	 * @param {string} kayttotarkoitus - 3-digit building purpose code
	 * @returns {string} Finnish description of building purpose, or original code if not found
	 * @see {@link https://kartta.hel.fi/avoindata/dokumentit/Rakennusrekisteri_avoindata_metatiedot_20160601.pdf|Code list documentation}
	 *
	 * @example
	 * decodeKayttotarkoitusHKI('011') // Returns 'Yhden asunnon talot' (Single-family houses)
	 * decodeKayttotarkoitusHKI('131') // Returns 'Asuntolat, vanhusten yms' (Dormitories, elderly homes, etc.)
	 * decodeKayttotarkoitusHKI('511') // Returns 'Peruskoulut, lukiot ja muut' (Primary schools, high schools, etc.)
	 */
	decodeKayttotarkoitusHKI(kayttotarkoitus) {
		switch (kayttotarkoitus) {
			case '011':
				return 'Yhden asunnon talot'
			case '012':
				return 'Kahden asunnon talot'
			case '013':
				return 'Muut pientalot'
			case '021':
				return 'Rivitalot'
			case '022':
				return 'Ketjutalot'
			case '032':
				return 'Luhtitalot'
			case '039':
				return 'Muut kerrostalot'
			case '041':
				return 'Vapaa-ajan asunnot'
			case '111':
				return 'Myymälähallit'
			case '112':
				return 'Liike- ja tavaratalot'
			case '119':
				return 'Myymälärakennukset'
			case '121':
				return 'Hotellit'
			case '123':
				return 'Loma- lepo- ja virkistyskodit'
			case '124':
				return 'Vuokrattavat lomamökit'
			case '129':
				return 'Muu majoitusliike'
			case '131':
				return 'Asuntolat, vanhusten yms'
			case '139':
				return 'Muut majoitusrakennukset'
			case '141':
				return 'Ravintolat, baarit yms'
			case '151':
				return 'Toimistorakennukset'
			case '161':
				return 'Asemat ja terminaalit'
			case '162':
				return 'Kulkuneuvojen rakennukset'
			case '163':
				return 'Pysäköintitalot'
			case '164':
				return 'Tietoliikenteen rakennukset'
			case '169':
				return 'Muut liikenteen rakennukset'
			case '211':
				return 'Keskussairaalat'
			case '213':
				return 'Muut sairaalat'
			case '214':
				return 'Terveyskeskukset'
			case '215':
				return 'Erityis terveydenhoito'
			case '219':
				return 'Muu terveydenhoito'
			case '221':
				return 'Vanhainkodit'
			case '222':
				return 'Lastenkodit, koulukodit'
			case '223':
				return 'Kehitysvammaisten hoito'
			case '229':
				return 'Muut huoltolaitokset'
			case '231':
				return 'Lasten päiväkodit'
			case '239':
				return 'Muut sosiaalitoimi'
			case '241':
				return 'Vankilat'
			case '311':
				return 'Teatterit, konsertti yms'
			case '312':
				return 'Elokuvateatterit'
			case '322':
				return 'Kirjastot'
			case '323':
				return 'Museot, taidegalleriat'
			case '324':
				return 'Näyttelyhallit'
			case '331':
				return 'Seurain-, nuoriso- yms'
			case '341':
				return 'Kirkot, kappelit yms'
			case '342':
				return 'Seurakuntatalot'
			case '349':
				return 'Muut uskonnolliset yhteisöt'
			case '351':
				return 'Jäähallit'
			case '352':
				return 'Uimahallit'
			case '353':
				return 'Tennis, squash yms'
			case '354':
				return 'Monitoimi/urheiluhallit'
			case '359':
				return 'Muut urheilu'
			case '369':
				return 'Muut kokoontumisrakennukset'
			case '511':
				return 'Peruskoulut, lukiot ja muut'
			case '521':
				return 'Ammatilliset oppilaitokset'
			case '531':
				return 'Korkeakoulurakennukset'
			case '532':
				return 'Tutkimuslaitosrakennukset'
			case '541':
				return 'Järjestöjen opetus'
			case '549':
				return 'Muut opetusrakennukset'
			case '611':
				return 'Voimalaitosrakennukset'
			case '613':
				return 'Yhdyskuntatekniikka'
			case '691':
				return 'Teollisuushallit'
			case '692':
				return 'Teollisuus- ja pienteollisuus'
			case '699':
				return 'Muut teollisuus/tuotanto'
			case '711':
				return 'Teollisuusvarastot'
			case '712':
				return 'Kauppavarastot'
			case '719':
				return 'Muut varastorakennukset'
			case '721':
				return 'Paloasemat'
			case '722':
				return 'Väestönsuojat'
			case '729':
				return 'Muu palo- ja pelastustoiminta'
			case '811':
				return 'Navetat, sikalat, kanalat yms'
			case '819':
				return 'Eläinsuojat'
			case '891':
				return 'Viljarakennukset'
			case '892':
				return 'Kasvihuoneet'
			case '893':
				return 'Turkistarhat'
			case '899':
				return 'Muu maa/metsä/kala'
			case '931':
				return 'Saunarakennukset'
			case '941':
				return 'Talousrakennukset'
			default:
				return kayttotarkoitus
		}
	}

	/**
	 * Decodes building material codes to English descriptions
	 * Maps numeric codes (1-5) to primary structural material types.
	 *
	 * @param {string} material - Single digit material code (1-5)
	 * @returns {string} English material description ('concrete', 'brick', 'steel', 'wood', 'other'), or original code if invalid
	 * @see {@link https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf|Material codes documentation}
	 *
	 * @example
	 * decodeMaterial('1') // Returns 'concrete'
	 * decodeMaterial('4') // Returns 'wood'
	 */
	decodeMaterial(material) {
		switch (material) {
			case '1':
				return 'concrete'
			case '2':
				return 'brick'
			case '3':
				return 'steel'
			case '4':
				return 'wood'
			case '5':
				return 'other'
			default:
				return material
		}
	}

	/**
	 * Decodes building heating method codes to English descriptions
	 * Maps codes (1-5) to heating distribution systems.
	 *
	 * @param {string} heatingMethod - Single digit heating method code (1-5)
	 * @returns {string} English heating method description, or original code if invalid
	 *
	 * @example
	 * decodeHeatingMethod('1') // Returns 'central water'
	 * decodeHeatingMethod('3') // Returns 'electricity'
	 */
	decodeHeatingMethod(heatingMethod) {
		switch (heatingMethod) {
			case '1':
				return 'central water'
			case '2':
				return 'central air'
			case '3':
				return 'electricity'
			case '4':
				return 'oven'
			case '5':
				return 'no fixed heating'
			default:
				return heatingMethod
		}
	}

	/**
	 * Decodes heating source/fuel type codes to English descriptions
	 * Maps codes (1-10) to energy sources used for heating.
	 *
	 * @param {string} heatingSource - Heating source code (1-10)
	 * @returns {string} English heating source description, or original code if invalid
	 *
	 * @example
	 * decodeHeatingSource('1') // Returns 'district'
	 * decodeHeatingSource('9') // Returns 'ground-source'
	 */
	decodeHeatingSource(heatingSource) {
		switch (heatingSource) {
			case '1':
				return 'district'
			case '2':
				return 'light fuel oil'
			case '3':
				return 'heavy fuel oil'
			case '4':
				return 'electricity'
			case '5':
				return 'gas'
			case '6':
				return 'coal'
			case '7':
				return 'wood'
			case '8':
				return 'peat'
			case '9':
				return 'ground-source'
			case '10':
				return 'other'
			default:
				return heatingSource
		}
	}

	/**
	 * Decodes facade material codes to English descriptions
	 * Maps numeric codes (1-7) to exterior building material types.
	 *
	 * @param {string} facade - Single digit facade material code (1-7)
	 * @returns {string} English facade material description ('concrete', 'brick', 'metal', 'stone', 'wood', 'glass', 'other'), or original code if invalid
	 * @see {@link https://kartta.hel.fi/avoindata/dokumentit/2017-01-10_Rakennusaineisto_avoindata_koodistot.pdf|Facade material codes}
	 *
	 * @example
	 * decodeFacade('2') // Returns 'brick'
	 * decodeFacade('6') // Returns 'glass'
	 */
	decodeFacade(facade) {
		switch (facade) {
			case '1':
				return 'concrete'
			case '2':
				return 'brick'
			case '3':
				return 'metal'
			case '4':
				return 'stone'
			case '5':
				return 'wood'
			case '6':
				return 'glass'
			case '7':
				return 'other'
			default:
				return facade
		}
	}

	/**
	 * Maps CSS color names to normalized color palette using K-means clustering
	 * Reduces 140+ web colors to ~40 representative colors for consistent visualization.
	 * Mapping generated from webcolors library using K-means clustering algorithm.
	 *
	 * @param {string} key - CSS color name (e.g., 'aliceblue', 'crimson', 'steelblue')
	 * @returns {string|null} Normalized color name from reduced palette, or null if not found
	 *
	 * @example
	 * getColorValue('aliceblue') // Returns 'seashell'
	 * getColorValue('crimson') // Returns 'red'
	 * getColorValue('steelblue') // Returns 'steelblue'
	 */
	getColorValue(key) {
		const colorMap = {
			aliceblue: 'seashell',
			antiquewhite: 'seashell',
			aqua: 'deepskyblue',
			aquamarine: 'aquamarine',
			azure: 'seashell',
			beige: 'seashell',
			bisque: 'peachpuff',
			black: 'black',
			blanchedalmond: 'peachpuff',
			blue: 'blue',
			blueviolet: 'blueviolet',
			brown: 'brown',
			burlywood: 'tan',
			cadetblue: 'steelblue',
			chartreuse: 'chartreuse',
			chocolate: 'peru',
			coral: 'peru',
			cornflowerblue: 'mediumslateblue',
			cornsilk: 'seashell',
			crimson: 'red',
			cyan: 'deepskyblue',
			darkblue: 'navy',
			darkcyan: 'darkcyan',
			darkgoldenrod: 'olive',
			darkgray: 'darkgray',
			darkgrey: 'darkgray',
			darkgreen: 'green',
			darkkhaki: 'tan',
			darkmagenta: 'purple',
			darkolivegreen: 'darkslategray',
			darkorange: 'orange',
			darkorchid: 'blueviolet',
			darkred: 'darkred',
			darksalmon: 'darksalmon',
			darkseagreen: 'darkgray',
			darkslateblue: 'purple',
			darkslategray: 'darkslategray',
			darkslategrey: 'darkslategray',
			darkturquoise: 'deepskyblue',
			darkviolet: 'blueviolet',
			deeppink: 'deeppink',
			deepskyblue: 'deepskyblue',
			dimgray: 'gray',
			dimgrey: 'gray',
			dodgerblue: 'deepskyblue',
			firebrick: 'brown',
			floralwhite: 'seashell',
			forestgreen: 'green',
			fuchsia: 'magenta',
			gainsboro: 'lightgray',
			ghostwhite: 'seashell',
			gold: 'gold',
			goldenrod: 'orange',
			gray: 'gray',
			grey: 'gray',
			green: 'green',
			greenyellow: 'chartreuse',
			honeydew: 'seashell',
			hotpink: 'orchid',
			indianred: 'peru',
			indigo: 'purple',
			ivory: 'seashell',
			khaki: 'peachpuff',
			lavender: 'seashell',
			lavenderblush: 'seashell',
			lawngreen: 'chartreuse',
			lemonchiffon: 'seashell',
			lightblue: 'lightblue',
			lightcoral: 'darksalmon',
			lightcyan: 'seashell',
			lightgoldenrodyellow: 'seashell',
			lightgray: 'lightgray',
			lightgrey: 'lightgray',
			lightgreen: 'lightgreen',
			lightpink: 'peachpuff',
			lightsalmon: 'darksalmon',
			lightseagreen: 'lightseagreen',
			lightskyblue: 'lightblue',
			lightslategray: 'gray',
			lightslategrey: 'gray',
			lightsteelblue: 'lightblue',
			lightyellow: 'seashell',
			lime: 'lime',
			limegreen: 'lime',
			linen: 'seashell',
			magenta: 'magenta',
			maroon: 'darkred',
			mediumaquamarine: 'mediumturquoise',
			mediumblue: 'blue',
			mediumorchid: 'orchid',
			mediumpurple: 'mediumslateblue',
			mediumseagreen: 'lightseagreen',
			mediumslateblue: 'mediumslateblue',
			mediumspringgreen: 'springgreen',
			mediumturquoise: 'mediumturquoise',
			mediumvioletred: 'deeppink',
			midnightblue: 'navy',
			mintcream: 'seashell',
			mistyrose: 'seashell',
			moccasin: 'peachpuff',
			navajowhite: 'peachpuff',
			navy: 'navy',
			oldlace: 'seashell',
			olive: 'olive',
			olivedrab: 'olive',
			orange: 'orange',
			orangered: 'red',
			orchid: 'orchid',
			palegoldenrod: 'peachpuff',
			palegreen: 'lightgreen',
			paleturquoise: 'lightblue',
			palevioletred: 'darksalmon',
			papayawhip: 'seashell',
			peachpuff: 'peachpuff',
			peru: 'peru',
			pink: 'peachpuff',
			plum: 'orchid',
			powderblue: 'lightblue',
			purple: 'purple',
			red: 'red',
			rosybrown: 'darkgray',
			royalblue: 'steelblue',
			saddlebrown: 'brown',
			salmon: 'darksalmon',
			sandybrown: 'darksalmon',
			seagreen: 'darkslategray',
			seashell: 'seashell',
			sienna: 'brown',
			silver: 'lightgray',
			skyblue: 'lightblue',
			slateblue: 'mediumslateblue',
			slategray: 'gray',
			slategrey: 'gray',
			snow: 'seashell',
			springgreen: 'springgreen',
			steelblue: 'steelblue',
			tan: 'tan',
			teal: 'darkcyan',
			thistle: 'lightgray',
			tomato: 'peru',
			turquoise: 'mediumturquoise',
			violet: 'orchid',
			wheat: 'peachpuff',
			white: 'seashell',
			whitesmoke: 'seashell',
			yellow: 'gold',
			yellowgreen: 'chartreuse',
		}

		return colorMap[key.toLowerCase()] || null
	}
}
