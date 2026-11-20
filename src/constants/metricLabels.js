/**
 * @module constants/metricLabels
 * Display names for metrics, grid indices and building attributes (#1154, #1156).
 *
 * Every chart, legend, tooltip, select and Details row that names a metric or a
 * building attribute reads the name from here, so one metric has one name and no
 * two metrics share one. `tests/unit/lint/no-hardcoded-metric-labels.test.js`
 * fails if a component spells out a name this module defines.
 *
 * Display text only: the data keys, store fields and URL params are unchanged.
 * Field-level labels are in sentence case (#1176).
 */

/** The metrics that appear in more than one place. */
export const METRIC_LABELS = Object.freeze({
	/** `heat_index`: total social vulnerability to high temperatures. */
	HEAT_VULNERABILITY: 'Heat vulnerability',
	/** `flood_index`: total social vulnerability to flooding. */
	FLOOD_VULNERABILITY: 'Flood vulnerability',
	/** `heat_exposure`: the exposure component of social vulnerability. Nothing else is "Heat exposure". */
	HEAT_EXPOSURE: 'Heat exposure',
	/**
	 * The 0-1 Landsat surface heat value: `avgheatexposure`, `hki_avgheatexposure`,
	 * `avgheatexposuretobuilding`, `averageheatexposure` and the grid's
	 * `final_avg_conditional`.
	 */
	SURFACE_HEAT_INDEX: 'Surface heat index (Landsat)',
	/** The 0-1 Landsat value for cold periods (`avgcoldexposure`). */
	SURFACE_COLD_INDEX: 'Surface cold index (Landsat)',
	/** Surface temperature in °C (`avg_temp_c`). */
	SURFACE_TEMPERATURE: 'Surface temperature (°C)',
	/** `green`: green space availability. */
	GREEN_SPACE: 'Green space',
})

/**
 * Map layers that have both a Layers-tab switch and an Analysis entry (#1155). The
 * switch (`LayerSwitch.vue`) and the Analysis button (`analysisRegistry.js`) both
 * read the name from here, so the two entry points cannot drift apart again. E2E
 * specs locate the switch and the button by these names.
 */
export const LAYER_LABELS = Object.freeze({
	/** HSY land cover classification (`toggleStore.landCover`). */
	LAND_COVER: 'Land Cover',
	/** NDVI satellite imagery (`toggleStore.ndvi`). */
	NDVI: 'NDVI (Vegetation)',
})

/** Statistical-grid index (`propsStore.statsIndex` value) → display name. */
export const INDEX_LABELS = Object.freeze({
	heat_index: METRIC_LABELS.HEAT_VULNERABILITY,
	flood_index: METRIC_LABELS.FLOOD_VULNERABILITY,
	sensitivity: 'Sensitivity',
	flood_exposure: 'Flood exposure',
	flood_prepare: 'Flood preparedness',
	flood_respond: 'Flood response',
	flood_recover: 'Flood recovery',
	heat_exposure: METRIC_LABELS.HEAT_EXPOSURE,
	heat_prepare: 'Heat preparedness',
	heat_respond: 'Heat response',
	age: 'Age',
	info: 'Information',
	tenure: 'Tenure',
	green: METRIC_LABELS.GREEN_SPACE,
	social_networks: 'Social networks',
	overcrowding: 'Overcrowding',
	avgheatexposure: METRIC_LABELS.SURFACE_HEAT_INDEX,
	// Combined indices name the colored index first and the height index second.
	combined_avgheatexposure: 'Combined indices (surface heat/heat)',
	combined_heatindex_avgheatexposure: 'Combined indices (heat/surface heat)',
	combined_heat_flood: 'Combined indices (heat/flood)',
	combined_flood_heat: 'Combined indices (flood/heat)',
	combined_heat_flood_green: 'Combined indices (heat/flood/green)',
})

/**
 * One name per building attribute. Datasets use different keys for the same
 * attribute (`kavu`, `year_of_construction`), so names are per attribute and
 * `PROPERTY_LABELS` maps each key to one of them.
 */
export const BUILDING_ATTRIBUTE_LABELS = Object.freeze({
	HEIGHT: 'Height (m)',
	YEAR_BUILT: 'Year built',
	/** Helsinki's `c_valmpvm`: a full date, so not "Year built". */
	COMPLETION_DATE: 'Completion date',
	/** Years since construction; the Helsinki scatter plot derives it from `c_valmpvm`. */
	AGE: 'Age (years)',
	AREA: 'Area (m²)',
	VOLUME: 'Volume (m³)',
	FLOORS: 'Floors',
	FLOOR_AREA: 'Floor area (m²)',
	TOTAL_AREA: 'Total area (m²)',
	APARTMENTS: 'Apartments',
	FACADE_MATERIAL: 'Facade material',
	BUILDING_MATERIAL: 'Building material',
	BUILDING_USE: 'Building use',
	BUILDING_TYPE: 'Building type',
	HEATING_METHOD: 'Heating method',
	HEATING_SOURCE: 'Heating source',
	ROOF_TYPE: 'Roof type',
	ROOF_MEDIAN_COLOR: 'Roof median color',
	ROOF_MODE_COLOR: 'Roof mode color',
})

const A = BUILDING_ATTRIBUTE_LABELS

/**
 * Entity property key → display name, for Details (AreaProperties) and the
 * scatter-plot selects. A key missing here is auto-formatted by the caller.
 */
export const PROPERTY_LABELS = Object.freeze({
	// Metrics
	avgheatexposuretobuilding: METRIC_LABELS.SURFACE_HEAT_INDEX,
	averageheatexposure: METRIC_LABELS.SURFACE_HEAT_INDEX,
	avg_temp_c: METRIC_LABELS.SURFACE_TEMPERATURE,

	// Building attributes: HSY keys, Helsinki keys, and the keys Details shows
	measured_height: A.HEIGHT,
	kavu: A.YEAR_BUILT,
	year_of_construction: A.YEAR_BUILT,
	c_valmpvm: A.COMPLETION_DATE,
	area_m2: A.AREA,
	i_raktilav: A.VOLUME,
	kerrosten_lkm: A.FLOORS,
	i_kerrlkm: A.FLOORS,
	kerala: A.FLOOR_AREA,
	korala: A.TOTAL_AREA,
	asuntojen_lkm: A.APARTMENTS,
	julkisivu_s: A.FACADE_MATERIAL,
	c_julkisivu: A.FACADE_MATERIAL,
	rakennusaine_s: A.BUILDING_MATERIAL,
	c_rakeaine: A.BUILDING_MATERIAL,
	tyyppi: A.BUILDING_TYPE,
	kayttotarkoitus: A.BUILDING_USE,
	kayttarks: A.BUILDING_USE,
	lammitystapa_s: A.HEATING_METHOD,
	c_lammtapa: A.HEATING_METHOD,
	lammitysaine_s: A.HEATING_SOURCE,
	c_poltaine: A.HEATING_SOURCE,
	roof_type: A.ROOF_TYPE,
	roof_median_color: A.ROOF_MEDIAN_COLOR,
	roof_mode_color: A.ROOF_MODE_COLOR,

	// Identifiers, area, address and vegetation
	vtj_prt: 'Building ID',
	posno: 'Postal code',
	nimi: 'Name',
	asukkaita: 'Population',
	katunimi_suomi: 'Street',
	osoitenumero: 'Street no.',
	tree_cover_m2: 'Tree cover (m²)',
	vegetation_m2: 'Vegetation (m²)',
	water_m2: 'Water (m²)',
	distancetounder40: 'Dist. to cool area',
	p_ala_m2: 'Tree area (m²)',
	korkeus_ka_m: 'Tree height (m)',
	grid_id: 'Grid ID',
})

/**
 * @param {string} key - Entity property key
 * @returns {string | undefined} The display name, or undefined for an unknown key
 */
export const propertyLabel = (key) => PROPERTY_LABELS[key]

/**
 * The first bar of the socioeconomics chart: the area's Landsat value for the
 * active view (surface heat, or surface cold with the capital-region cold toggle).
 */
export const SOCIOECONOMIC_HEAT_INDICATORS = Object.freeze({
	surfaceHeat: Object.freeze({
		label: METRIC_LABELS.SURFACE_HEAT_INDEX,
		description: 'Average surface heat index (Landsat) of residential buildings.',
	}),
	surfaceCold: Object.freeze({
		label: METRIC_LABELS.SURFACE_COLD_INDEX,
		description:
			'Average surface cold index (Landsat) of residential buildings during cold periods.',
	}),
})

/**
 * The other socioeconomics bars, in chart order. Age bands are in the labels: the
 * grid's Age and Sensitivity indices use different bands (0-6, 75+).
 */
export const SOCIOECONOMIC_INDICATORS = Object.freeze([
	Object.freeze({
		label: 'Children and elderly (0-12, 65+) %',
		description: 'Percentage of the population aged 0-12 or 65 and over.',
	}),
	Object.freeze({
		label: 'Children (0-12) %',
		description: 'Percentage of the population aged 0-12.',
	}),
	Object.freeze({
		label: 'Elderly (65+) %',
		description: 'Percentage of the population aged 65 and over.',
	}),
	Object.freeze({
		label: 'Unemployed rate',
		description:
			'Percentage of the population that is unemployed. Higher values indicate higher unemployment rates.',
	}),
	Object.freeze({
		label: 'Size of apartments',
		description: 'Relative size of apartments. Higher values indicate smaller apartment sizes.',
	}),
	Object.freeze({
		label: 'Basic education %',
		description:
			'Percentage of the population with only basic education. Higher values indicate lower education levels.',
	}),
	Object.freeze({
		label: 'Income',
		description: 'Relative income level in the area. Higher values indicate lower income levels.',
	}),
	Object.freeze({
		label: 'Rentals %',
		description:
			'Percentage of residential properties that are rented. Higher values indicate a higher proportion of rentals.',
	}),
])

/**
 * A label as it reads mid-sentence: first letter lower-cased, unless the label
 * starts with an acronym ("NDVI", "ID number").
 * @param {string} label
 * @returns {string}
 */
export const inSentence = (label) =>
	/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label
