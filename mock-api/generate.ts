/**
 * @module mock-api/generate
 * Mock Data Generator
 *
 * Generates realistic GeoJSON fixtures for all PyGeoAPI collections used by
 * the R4C-Cesium-Viewer application. Uses real Helsinki region postal codes
 * and coordinate bounds to create synthetic but realistic building, tree,
 * heat exposure, and other geospatial data.
 *
 * For detailed documentation of building properties, see:
 * ../docs/data/BUILDING_PROPERTIES.md
 *
 * Features:
 * - Generates buildings with full property set (identifiers, location, type, heat data, population)
 * - Creates heat timeseries data for temporal visualization
 * - Produces matching urban heat building records for Helsinki view
 * - Generates trees, cold areas, landcover, and travel time data
 * - Configurable density and postal code count via CLI args
 *
 * @example
 * ```bash
 * bun run generate                    # Default: 50 buildings per postal code
 * bun run generate --density 100      # 100 buildings per postal code
 * bun run generate --postal-codes 10  # Only generate for 10 postal codes
 * ```
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Geographic coordinates for a postal code center point
 * @typedef {Object} PostalCodeCenter
 * @property {number} lat - Latitude in WGS84 decimal degrees
 * @property {number} lon - Longitude in WGS84 decimal degrees
 * @property {string} name - Finnish neighborhood name
 */
type PostalCodeCenter = { lat: number; lon: number; name: string }

/**
 * Heat timeseries entry for a specific measurement date
 * @typedef {Object} HeatTimeseriesEntry
 * @property {string} date - Measurement date in YYYY-MM-DD format
 * @property {number} avg_temp_c - Average surface temperature in Celsius
 * @property {number} avgheatexposure - Heat exposure value (0-1 scale, higher = hotter)
 */
type HeatTimeseriesEntry = {
	date: string
	avg_temp_c: number
	avgheatexposure: number
}

/**
 * GeoJSON Feature representing a building
 * @typedef {Object} BuildingFeature
 * @property {string} type - Always "Feature"
 * @property {string} id - Building ID (vtj_prt format: 9 digits + letter)
 * @property {Object} geometry - GeoJSON Polygon geometry
 * @property {Object} properties - Building properties (see BUILDING_PROPERTIES.md)
 */
type BuildingFeature = {
	type: 'Feature'
	id: string
	geometry: { type: 'Polygon'; coordinates: number[][][] }
	properties: Record<string, unknown>
}

// ============================================================================
// Configuration
// ============================================================================

/** Output directory for generated fixture files */
const FIXTURES_DIR = join(import.meta.dir, 'fixtures')

// Parse CLI args
const args = process.argv.slice(2)
const densityIdx = args.indexOf('--density')
const postalCodesIdx = args.indexOf('--postal-codes')

/** Number of buildings to generate per postal code area */
const BUILDINGS_PER_POSTAL = densityIdx !== -1 ? Number(args[densityIdx + 1]) : 50

/** Maximum number of postal codes to process (null = all) */
const MAX_POSTAL_CODES = postalCodesIdx !== -1 ? Number(args[postalCodesIdx + 1]) : null

// Helsinki region postal codes with approximate center coordinates
// Based on real postal code areas in Capital Region
const POSTAL_CODES: Record<string, { lat: number; lon: number; name: string }> = {
	'00100': { lat: 60.1699, lon: 24.9384, name: 'Helsinki keskusta' },
	'00120': { lat: 60.1633, lon: 24.9296, name: 'Punavuori' },
	'00130': { lat: 60.1653, lon: 24.9458, name: 'Kaartinkaupunki' },
	'00140': { lat: 60.1555, lon: 24.9516, name: 'Kaivopuisto' },
	'00150': { lat: 60.1608, lon: 24.9231, name: 'Eira' },
	'00160': { lat: 60.1629, lon: 24.9098, name: 'Katajanokka' },
	'00170': { lat: 60.1773, lon: 24.9527, name: 'Kruununhaka' },
	'00180': { lat: 60.1687, lon: 24.9656, name: 'Kluuvi' },
	'00200': { lat: 60.1848, lon: 24.9116, name: 'Kallio' },
	'00210': { lat: 60.1901, lon: 24.9301, name: 'Vallila' },
	'00220': { lat: 60.1881, lon: 24.9554, name: 'Sörnäinen' },
	'00240': { lat: 60.1838, lon: 24.9777, name: 'Käpylä' },
	'00250': { lat: 60.2008, lon: 24.9586, name: 'Toukola' },
	'00260': { lat: 60.2019, lon: 24.9301, name: 'Koskela' },
	'00270': { lat: 60.2081, lon: 24.9654, name: 'Vanhakaupunki' },
	'00280': { lat: 60.2173, lon: 24.9776, name: 'Viikki' },
	'00300': { lat: 60.1765, lon: 24.8886, name: 'Pikku Huopalahti' },
	'00310': { lat: 60.1852, lon: 24.8716, name: 'Kivihaka' },
	'00320': { lat: 60.1926, lon: 24.8819, name: 'Etelä-Haaga' },
	'00330': { lat: 60.2042, lon: 24.8811, name: 'Munkkiniemi' },
	'00340': { lat: 60.2175, lon: 24.8706, name: 'Kuusisaari' },
	'00350': { lat: 60.1992, lon: 24.8562, name: 'Munkkivuori' },
	'00360': { lat: 60.2122, lon: 24.8529, name: 'Pajamäki' },
	'00370': { lat: 60.2251, lon: 24.8629, name: 'Reimarla' },
	'00380': { lat: 60.2341, lon: 24.8507, name: 'Pitäjänmäki' },
	'00400': { lat: 60.2295, lon: 24.9152, name: 'Oulunkylä' },
	'00410': { lat: 60.2376, lon: 24.9016, name: 'Maunula' },
	'00420': { lat: 60.2248, lon: 24.8887, name: 'Pirkkola' },
	'00430': { lat: 60.2419, lon: 24.9301, name: 'Patola' },
	'00440': { lat: 60.2495, lon: 24.9086, name: 'Metsälä' },
	'00500': { lat: 60.1886, lon: 24.9747, name: 'Sörnäinen itä' },
	'00510': { lat: 60.1983, lon: 24.9861, name: 'Alppila' },
	'00520': { lat: 60.1866, lon: 24.9987, name: 'Itäkeskus' },
	'00530': { lat: 60.1948, lon: 25.0134, name: 'Kalasatama' },
	'00540': { lat: 60.2012, lon: 25.0289, name: 'Kulosaari' },
	'00550': { lat: 60.1884, lon: 25.0467, name: 'Herttoniemi' },
	'00560': { lat: 60.2011, lon: 25.0648, name: 'Roihuvuori' },
	'00570': { lat: 60.2139, lon: 25.0798, name: 'Laajasalo' },
	'00580': { lat: 60.1962, lon: 25.0932, name: 'Verkkosaari' },
	'00600': { lat: 60.2412, lon: 24.8762, name: 'Kaarela' },
	'00610': { lat: 60.2536, lon: 24.8619, name: 'Kannelmäki' },
	'00620': { lat: 60.2629, lon: 24.8753, name: 'Malminkartano' },
	'00630': { lat: 60.2388, lon: 24.8416, name: 'Myyrmäki' },
	'00640': { lat: 60.2295, lon: 24.8204, name: 'Martinlaakso' },
	'00650': { lat: 60.2182, lon: 24.8051, name: 'Vantaa' },
	'00660': { lat: 60.2488, lon: 24.7984, name: 'Hämevaara' },
	'00670': { lat: 60.2591, lon: 24.8201, name: 'Vantaanlaakso' },
	'00680': { lat: 60.2456, lon: 24.9441, name: 'Pakila' },
	'00690': { lat: 60.2513, lon: 24.9662, name: 'Pukinmäki' },
	'00700': { lat: 60.2619, lon: 24.9498, name: 'Malmi' },
	'00710': { lat: 60.2412, lon: 24.9896, name: 'Pihlajamäki' },
	'00720': { lat: 60.2501, lon: 25.0141, name: 'Puistola' },
	'00730': { lat: 60.2627, lon: 25.0367, name: 'Tapanila' },
	'00740': { lat: 60.2789, lon: 25.0512, name: 'Suutarila' },
	'00750': { lat: 60.2892, lon: 25.0159, name: 'Puistola pohj.' },
	'00760': { lat: 60.2745, lon: 24.9876, name: 'Suurmetsä' },
	'00770': { lat: 60.2888, lon: 24.9698, name: 'Jakomäki' },
	'00780': { lat: 60.2991, lon: 24.9429, name: 'Tapaninvainio' },
	'00790': { lat: 60.3081, lon: 24.9187, name: 'Viikki pohj.' },
	'00800': { lat: 60.2182, lon: 25.0987, name: 'Laajasalo' },
	'00810': { lat: 60.2096, lon: 25.1234, name: 'Herttoniemenranta' },
	'00820': { lat: 60.2189, lon: 25.1412, name: 'Roihupelto' },
	'00830': { lat: 60.2288, lon: 25.0823, name: 'Tammisalo' },
	'00840': { lat: 60.2129, lon: 25.1098, name: 'Laajasalo itä' },
	'00850': { lat: 60.2401, lon: 25.0456, name: 'Jollas' },
	'00860': { lat: 60.2187, lon: 25.0652, name: 'Santahamina' },
	'00870': { lat: 60.2341, lon: 25.1287, name: 'Vartiokylä' },
	'00880': { lat: 60.2433, lon: 25.1098, name: 'Roihupelto' },
	'00890': { lat: 60.2512, lon: 25.0876, name: 'Mellunmäki' },
	'00900': { lat: 60.1987, lon: 25.1623, name: 'Vuosaari' },
	'00910': { lat: 60.2102, lon: 25.1876, name: 'Vuosaari itä' },
	'00920': { lat: 60.2233, lon: 25.1512, name: 'Meri-Rastila' },
	'00930': { lat: 60.1889, lon: 25.1234, name: 'Aurinkolahti' },
	'00940': { lat: 60.1756, lon: 25.0987, name: 'Kontula' },
	'00950': { lat: 60.2412, lon: 25.1654, name: 'Vartiosaari' },
	'00960': { lat: 60.2112, lon: 25.2012, name: 'Östersundom' },
	'00970': { lat: 60.2245, lon: 25.1876, name: 'Mellunmäki itä' },
	'00980': { lat: 60.2401, lon: 25.2123, name: 'Vuosaari pohj.' },
	'00990': { lat: 60.2534, lon: 25.1234, name: 'Vuosaari lounais' },
	// Espoo
	'02100': { lat: 60.2048, lon: 24.6559, name: 'Espoon keskus' },
	'02150': { lat: 60.1614, lon: 24.7389, name: 'Otaniemi' },
	'02200': { lat: 60.1689, lon: 24.7123, name: 'Tapiola' },
	'02230': { lat: 60.1752, lon: 24.8012, name: 'Matinkylä' },
	'02320': { lat: 60.1598, lon: 24.7667, name: 'Haukilahti' },
	'02600': { lat: 60.2089, lon: 24.6234, name: 'Leppävaara' },
	'02700': { lat: 60.1889, lon: 24.6512, name: 'Kauniainen' },
	// Vantaa
	'01200': { lat: 60.2912, lon: 24.9512, name: 'Hakunila' },
	'01300': { lat: 60.2912, lon: 25.0412, name: 'Tikkurila' },
	'01350': { lat: 60.3145, lon: 25.0234, name: 'Hiekkaharju' },
	'01400': { lat: 60.2734, lon: 24.8512, name: 'Vantaa keskus' },
	'01450': { lat: 60.3012, lon: 24.8912, name: 'Korso' },
	'01510': { lat: 60.3189, lon: 24.9612, name: 'Vantaankoski' },
	'01600': { lat: 60.3312, lon: 24.8712, name: 'Martinlaakso' },
	'01620': { lat: 60.2789, lon: 24.8334, name: 'Myyrmäki' },
}

// ============================================================================
// Building Type Constants
// ============================================================================

/**
 * Finnish building usage type strings (kayttarks)
 * Used in Capital Region view for building classification
 * @see ../docs/data/BUILDING_PROPERTIES.md#building-type-strings-kayttarks
 */
const BUILDING_TYPES = ['Asuinrakennus', 'Liikerakennus', 'Teollisuusrakennus', 'Yleinen rakennus', 'Toimistorakennus']

/**
 * Numeric building usage codes (c_kayttark) per Statistics Finland classification
 * SOTE buildings (social/healthcare) are codes 211-259 and 311-369
 * These codes determine which buildings are highlighted when SOTE filter is enabled
 * @see https://www.stat.fi/meta/luokitukset/rakennus/001-1994/index.html
 * @see ../docs/data/BUILDING_PROPERTIES.md#building-type-codes-c_kayttark
 */
const BUILDING_TYPE_CODES = [
	111, // Residential apartment building
	121, // Row houses
	211, // SOTE: Day care center (päiväkoti)
	241, // SOTE: Elderly care home (vanhainkoti)
	311, // SOTE: Health center (terveyskeskus)
	511, // Office building
	611, // Commercial building
	711, // Industrial building
	811, // Educational building
]

/**
 * Building heating types (lammitystapa_s)
 * Describes the primary heating method for the building
 */
const HEATING_TYPES = ['DISTRICT_HEATING', 'ELECTRIC', 'OIL', 'GAS', 'GEOTHERMAL']

/**
 * Building construction materials in Finnish (rakennusaine_s)
 * Displayed in building tooltip when hovering
 * @see ../docs/data/BUILDING_PROPERTIES.md#construction-materials-rakennusaine_s
 */
const BUILDING_MATERIALS = ['Betoni', 'Tiili', 'Puu', 'Teräs', 'Kivi', 'Lasi'] // Concrete, Brick, Wood, Steel, Stone, Glass

// ============================================================================
// Heat Data Constants
// ============================================================================

/**
 * Measurement dates for heat timeseries data
 * Includes summer dates (high heat) and one winter reference date (2021-02-18)
 * The winter date uses blue coloring in visualization
 */
const HEAT_DATA_DATES = [
	'2021-02-18', // Winter reference date (cold, blue visualization)
	'2021-06-25',
	'2021-07-15',
	'2021-08-10',
	'2022-06-28',
	'2022-07-18',
	'2023-07-15',
]

// ============================================================================
// Nature & Landcover Constants
// ============================================================================

/** Tree type categories for tree polygon data */
const TREE_TYPES = ['DECIDUOUS', 'CONIFEROUS', 'MIXED']

/**
 * Tree height category codes (koodi field)
 * T510-T550 represent different tree height ranges
 */
const TREE_CODES = ['T510', 'T520', 'T530', 'T540', 'T550']

/** Land cover classification types for adaptation analysis */
const LANDCOVER_TYPES = ['FOREST', 'WATER', 'URBAN', 'GRASS', 'AGRICULTURAL', 'BARE']

// ============================================================================
// Address Constants
// ============================================================================

/**
 * Real Finnish street names from Helsinki
 * Used to generate realistic addresses for mock buildings
 */
const STREET_NAMES = [
	'Mannerheimintie', 'Aleksanterinkatu', 'Esplanadi', 'Bulevardi', 'Fredrikinkatu',
	'Hämeentie', 'Mechelininkatu', 'Runeberginkatu', 'Tehtaankatu', 'Unioninkatu',
	'Kaivokatu', 'Lönnrotinkatu', 'Annankatu', 'Eerikinkatu', 'Iso Roobertinkatu',
	'Kampinkuja', 'Vironkatu', 'Pohjoisesplanadi', 'Eteläranta', 'Korkeavuorenkatu',
	'Laivurinkatu', 'Pietarinkatu', 'Apollonkatu', 'Caloniuksenkatu', 'Dagmarinkatu',
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random number within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random number between min and max
 */
function randomInRange(min: number, max: number): number {
	return Math.random() * (max - min) + min
}

/**
 * Select a random element from an array
 * @template T
 * @param {T[]} arr - Array to select from
 * @returns {T} Randomly selected element
 */
function randomChoice<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate a building ID in VTJ format (vtj_prt)
 * Format: 9 random digits followed by 1 uppercase letter (e.g., "123456789A")
 * This matches the format used by the Finnish Population Register Centre
 * @returns {string} Building ID in VTJ format
 */
function generateBuildingId(): string {
	const num = Math.floor(Math.random() * 900000000) + 100000000
	const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
	return `${num}${letter}`
}

/**
 * Generate heat timeseries data for a building
 *
 * Creates an array of heat measurements across multiple dates, simulating
 * temperature variation over time. Used by BuildingStyler and heat charts
 * for temporal visualization.
 *
 * Temperature calculation:
 * - Summer dates: base 20°C + (heat exposure × 15°C range) = 20-35°C
 * - Winter date: base -5°C + (heat exposure × 10°C range) = -5 to +5°C
 *
 * @param {number} baseHeatExposure - Base heat exposure value (0-1 scale)
 * @returns {HeatTimeseriesEntry[]} Array of heat measurements per date
 * @see ../docs/data/BUILDING_PROPERTIES.md#heat-timeseries-structure
 */
function generateHeatTimeseries(baseHeatExposure: number): HeatTimeseriesEntry[] {
	return HEAT_DATA_DATES.map((date) => {
		// Add ±15% variation per date to simulate measurement differences
		const variation = randomInRange(-0.15, 0.15)
		const heatExposure = Math.max(0, Math.min(1, baseHeatExposure + variation))

		// Winter date (2021-02-18) uses different temperature range
		const isWinter = date === '2021-02-18'
		const baseTemp = isWinter ? -5 : 20
		const tempRange = isWinter ? 10 : 15

		return {
			date,
			avg_temp_c: baseTemp + heatExposure * tempRange,
			avgheatexposure: heatExposure,
		}
	})
}

/**
 * Generate population age distribution for a building
 *
 * Creates normalized fractions (summing to 1.0) representing the proportion
 * of building residents in each age group. Used by BuildingGridChart.vue
 * to display demographic bar charts.
 *
 * Age groups: 0-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60-69, 70-79, 80+
 *
 * @returns {number[]} Array of 9 fractions (one per age group), normalized to sum to 1.0
 * @see ../docs/data/BUILDING_PROPERTIES.md#population-distribution
 */
function generatePopulationDistribution(): number[] {
	// Generate random percentages with realistic ranges per age group
	const raw = [
		randomInRange(0.05, 0.15), // 0-9:   Children
		randomInRange(0.08, 0.15), // 10-19: Adolescents
		randomInRange(0.10, 0.20), // 20-29: Young adults (often largest group)
		randomInRange(0.10, 0.18), // 30-39: Adults
		randomInRange(0.08, 0.15), // 40-49: Middle-aged
		randomInRange(0.08, 0.15), // 50-59: Middle-aged
		randomInRange(0.06, 0.12), // 60-69: Pre-retirement
		randomInRange(0.04, 0.10), // 70-79: Elderly
		randomInRange(0.02, 0.08), // 80+:   Elderly (smallest group)
	]
	// Normalize to ensure sum equals 1.0
	const total = raw.reduce((a, b) => a + b, 0)
	return raw.map((v) => v / total)
}

/**
 * Generate a GeoJSON Polygon geometry for a building footprint
 *
 * Creates a rectangular polygon with random rotation (0-45°) centered
 * at the given coordinates. The polygon is closed (first and last
 * coordinate are identical) as required by GeoJSON spec.
 *
 * @param {number} centerLon - Center longitude in WGS84 decimal degrees
 * @param {number} centerLat - Center latitude in WGS84 decimal degrees
 * @param {number} [size=0.0003] - Approximate size in degrees (~30m at Helsinki latitude)
 * @returns {number[][][]} GeoJSON Polygon coordinates array
 */
function generatePolygon(centerLon: number, centerLat: number, size = 0.0003): number[][][] {
	const halfSize = size / 2
	const rotation = Math.random() * Math.PI / 4 // Random rotation 0-45 degrees

	// Define rectangle corners relative to center
	const corners = [
		[-halfSize, -halfSize],
		[halfSize, -halfSize],
		[halfSize, halfSize],
		[-halfSize, halfSize],
		[-halfSize, -halfSize], // Close the polygon (GeoJSON requirement)
	]

	// Apply rotation matrix and translate to center coordinates
	const rotatedCorners = corners.map(([x, y]) => {
		const rx = x * Math.cos(rotation) - y * Math.sin(rotation)
		const ry = x * Math.sin(rotation) + y * Math.cos(rotation)
		return [centerLon + rx, centerLat + ry]
	})

	return [rotatedCorners]
}

// ============================================================================
// Feature Generators
// ============================================================================

/**
 * Generate a complete building feature with all properties
 *
 * Creates a GeoJSON Feature representing a building with comprehensive
 * properties for both Capital Region and Helsinki views. Includes:
 * - Identifiers (vtj_prt, ratu, hki_id)
 * - Location (postal code, municipality)
 * - Building type (string and numeric code)
 * - Physical characteristics (floors, height, area, material)
 * - Construction date (for age filtering)
 * - Heat exposure data (direct value and timeseries)
 * - Address (street name and number)
 * - Population distribution (9 age groups)
 *
 * @param {string} postalCode - 5-digit Finnish postal code (e.g., "00100")
 * @param {PostalCodeCenter} center - Center coordinates of the postal code area
 * @param {number} index - Building index within the postal code (used for ID generation)
 * @returns {BuildingFeature} Complete GeoJSON Feature with all building properties
 * @see ../docs/data/BUILDING_PROPERTIES.md
 */
function generateBuilding(postalCode: string, center: { lat: number; lon: number }, index: number) {
	const offset = 0.008 // ~800m spread around center
	const lon = center.lon + randomInRange(-offset, offset)
	const lat = center.lat + randomInRange(-offset, offset)

	const buildingId = generateBuildingId()
	const heatExposure = randomInRange(0.2, 0.8)
	const floors = Math.floor(randomInRange(1, 15))
	const area = randomInRange(50, 2000)
	const measuredHeight = floors * 3.2 + randomInRange(-1, 2) // ~3.2m per floor with variation
	const yearBuilt = Math.floor(randomInRange(1900, 2024))
	const buildingTypeCode = randomChoice(BUILDING_TYPE_CODES)

	// Helsinki-style ID for matching with urban heat data (HKI_POSTAL_INDEX format)
	const hkiId = `HKI_${postalCode}_${index}`

	// Population distribution for residential buildings
	const popDist = generatePopulationDistribution()

	// Generate a completion date (c_valmpvm) - some buildings are new (post-2018)
	const isNewBuilding = yearBuilt >= 2018
	const completionDate = isNewBuilding
		? `${yearBuilt}-${String(Math.floor(randomInRange(1, 12))).padStart(2, '0')}-${String(Math.floor(randomInRange(1, 28))).padStart(2, '0')}`
		: `${yearBuilt}-06-15`

	return {
		type: 'Feature',
		id: buildingId,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(lon, lat, 0.0002 + Math.random() * 0.0003),
		},
		properties: {
			// Core identifiers
			id: hkiId, // Helsinki ID used for matching with urban heat data
			vtj_prt: buildingId,
			ratu: Math.floor(Math.random() * 900000) + 100000, // Building registry ID

			// Location
			postinumero: postalCode,
			posno: postalCode,
			kunta: postalCode.startsWith('02') ? 'Espoo' : postalCode.startsWith('01') ? 'Vantaa' : 'Helsinki',

			// Building type - both string and numeric code
			kayttarks: randomChoice(BUILDING_TYPES), // String type for Capital Region view
			c_kayttark: buildingTypeCode, // Numeric code for Helsinki view SOTE filter

			// Physical characteristics
			lammitystapa_s: randomChoice(HEATING_TYPES),
			rakennusaine_s: randomChoice(BUILDING_MATERIALS),
			kerrosten_lkm: floors, // Floor count for Capital Region view
			i_kerrlkm: floors, // Floor count for Helsinki view
			measured_height: measuredHeight, // For 3D building height
			area_m2: Math.round(area),
			kavu: Math.round(area * floors * 3), // Volume estimate

			// Construction date - for building age filter
			year_of_construction: String(yearBuilt),
			c_valmpvm: completionDate, // Completion date for hideNewBuildings filter

			// Heat exposure data
			avgheatexposure: heatExposure, // Legacy field
			avg_temp_c: 20 + heatExposure * 15, // Direct temperature for mock tooltip
			avgheatexposuretobuilding: heatExposure, // Helsinki view heat exposure
			heat_timeseries: generateHeatTimeseries(heatExposure), // Time series for Capital Region view
			distancetounder40: Math.floor(randomInRange(50, 2000)), // Distance to cooling area

			// Address fields for tooltip display
			katunimi_suomi: randomChoice(STREET_NAMES),
			osoitenumero: String(Math.floor(randomInRange(1, 150))),

			// Population distribution for BuildingGridChart
			pop_d_0_9: popDist[0],
			pop_d_10_19: popDist[1],
			pop_d_20_29: popDist[2],
			pop_d_30_39: popDist[3],
			pop_d_40_49: popDist[4],
			pop_d_50_59: popDist[5],
			pop_d_60_69: popDist[6],
			pop_d_70_79: popDist[7],
			pop_d_over80: popDist[8],
		},
	}
}

/**
 * Generate a heat exposure area polygon
 *
 * Creates larger polygons representing areas with measured heat exposure.
 * Used for area-based heat visualization overlays.
 *
 * @param {string} postalCode - Postal code for the area
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Area index
 * @returns {Object} GeoJSON Feature with heat exposure properties
 */
function generateHeatExposureArea(postalCode: string, center: { lat: number; lon: number }, index: number) {
	const offset = 0.006
	const lon = center.lon + randomInRange(-offset, offset)
	const lat = center.lat + randomInRange(-offset, offset)

	const heatExposure = randomInRange(0.3, 0.9)

	return {
		type: 'Feature',
		id: `HE_${postalCode}_${index}`,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(lon, lat, 0.001 + Math.random() * 0.002),
		},
		properties: {
			id: `HE_${postalCode}_${index}`,
			postinumero: postalCode,
			heatexposure: heatExposure,
			temp_c: 20 + heatExposure * 15,
			date: '2023-07-15',
		},
	}
}

/**
 * Generate a tree canopy polygon
 *
 * Creates small polygons representing tree coverage areas.
 * Properties include height category (koodi), area, and average height.
 *
 * @param {string} postalCode - Postal code for the tree location
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Tree index
 * @returns {Object} GeoJSON Feature with tree properties
 */
function generateTree(postalCode: string, center: { lat: number; lon: number }, index: number) {
	const offset = 0.008
	const lon = center.lon + randomInRange(-offset, offset)
	const lat = center.lat + randomInRange(-offset, offset)

	const koodi = randomChoice(TREE_CODES)
	const height = 5 + Math.random() * 20

	return {
		type: 'Feature',
		id: `TREE_${postalCode}_${index}`,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(lon, lat, 0.00005 + Math.random() * 0.0001),
		},
		properties: {
			id: `TREE_${postalCode}_${index}`,
			kohde_id: `TREE_${postalCode}_${index}`,
			postinumero: postalCode,
			koodi,
			kuvaus: randomChoice(TREE_TYPES),
			p_ala_m2: Math.round(randomInRange(10, 200)),
			korkeus_ka_m: Math.round(height * 10) / 10,
			kunta: 'Helsinki',
		},
	}
}

/**
 * Generate a cooling area (cold spot) point
 *
 * Creates point features representing locations with low heat exposure
 * (parks, water bodies, shaded areas). Heat exposure is 0.0-0.4 range.
 * Used for cooling accessibility analysis (distancetounder40).
 *
 * @param {string} postalCode - Postal code for the area
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Cold area index
 * @returns {Object} GeoJSON Point Feature with cooling properties
 */
function generateColdArea(postalCode: string, center: { lat: number; lon: number }, index: number) {
	const offset = 0.005
	const lon = center.lon + randomInRange(-offset, offset)
	const lat = center.lat + randomInRange(-offset, offset)

	return {
		type: 'Feature',
		id: `COLD_${postalCode}_${index}`,
		geometry: {
			type: 'Point',
			coordinates: [lon, lat],
		},
		properties: {
			id: `COLD_${postalCode}_${index}`,
			posno: postalCode,
			heatexposure: randomInRange(0.0, 0.4), // Cold spots have low heat exposure
			temp_c: randomInRange(15, 22),
			date: '2023-07-15',
		},
	}
}

/**
 * Generate an urban heat building for Helsinki view
 *
 * Creates building features specifically for the Helsinki view with
 * heat exposure data. Uses hki_id to match with main building records.
 * Generated at half the density of regular buildings.
 *
 * Key difference from generateBuilding():
 * - Uses hki_id for matching (not id)
 * - No heat_timeseries (Helsinki view uses avgheatexposuretobuilding directly)
 * - No population distribution
 *
 * @param {string} postalCode - Postal code
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Building index (multiplied by 2 for hki_id matching)
 * @returns {Object} GeoJSON Feature for Helsinki urban heat view
 */
function generateUrbanHeatBuilding(postalCode: string, center: { lat: number; lon: number }, index: number) {
	const offset = 0.008
	const lon = center.lon + randomInRange(-offset, offset)
	const lat = center.lat + randomInRange(-offset, offset)

	const heatExposure = randomInRange(0.2, 0.9)
	const floors = Math.floor(randomInRange(1, 15))
	const yearBuilt = Math.floor(randomInRange(1950, 2024))
	const buildingTypeCode = randomChoice(BUILDING_TYPE_CODES)

	// Use same hki_id format as buildings to enable matching
	// Index is multiplied by 2 to match building indices (since we generate half as many heat buildings)
	const matchingBuildingIndex = index * 2
	const hkiId = `HKI_${postalCode}_${matchingBuildingIndex}`

	return {
		type: 'Feature',
		id: `UHB_${postalCode}_${index}`,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(lon, lat, 0.0002 + Math.random() * 0.0002),
		},
		properties: {
			id: `UHB_${postalCode}_${index}`,
			hki_id: hkiId, // Matches building properties.id for heat data association
			ratu: Math.floor(Math.random() * 900000) + 100000,
			postinumero: postalCode,
			c_kayttark: buildingTypeCode, // Numeric code for SOTE filter
			i_kerrlkm: floors, // Floor count for Helsinki view
			katunimi_suomi: randomChoice(STREET_NAMES),
			osoitenumero: String(Math.floor(randomInRange(1, 150))),
			year_of_construction: String(yearBuilt),
			measured_height: floors * 3.2 + randomInRange(-1, 2),
			avgheatexposuretobuilding: heatExposure,
			distancetounder40: Math.floor(randomInRange(50, 2000)),
			area_m2: Math.round(randomInRange(50, 2000)),
		},
	}
}

/**
 * Generate a land cover grid cell for adaptation analysis
 *
 * Creates larger grid polygons covering the entire Helsinki region
 * with land cover classification. Used for climate adaptation analysis.
 *
 * @param {number} index - Grid cell index
 * @returns {Object} GeoJSON Feature with land cover properties
 */
function generateAdaptationLandcover(index: number) {
	// Generate across entire Helsinki region
	const lon = randomInRange(24.5, 25.3)
	const lat = randomInRange(60.1, 60.35)

	return {
		type: 'Feature',
		id: `GRID_${String(index).padStart(6, '0')}`,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(lon, lat, 0.002),
		},
		properties: {
			id: `GRID_${String(index).padStart(6, '0')}`,
			grid_id: `GRID_${String(index).padStart(6, '0')}`,
			area_m2: Math.round(randomInRange(1000, 50000)),
			year: randomChoice([2020, 2021, 2022, 2023, 2024]),
			koodi: randomChoice(LANDCOVER_TYPES),
		},
	}
}

/**
 * Generate a tree-to-building distance record
 *
 * Creates point features linking trees to nearby buildings with
 * distance measurements. Used for analyzing tree coverage effects
 * on building heat exposure.
 *
 * @param {string} postalCode - Postal code
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Record index
 * @returns {Object} GeoJSON Point Feature with distance data
 */
function generateTreeBuildingDistance(postalCode: string, center: { lat: number; lon: number }, index: number) {
	return {
		type: 'Feature',
		id: `TBD_${postalCode}_${index}`,
		geometry: {
			type: 'Point',
			coordinates: [
				center.lon + randomInRange(-0.008, 0.008),
				center.lat + randomInRange(-0.008, 0.008),
			],
		},
		properties: {
			id: `TBD_${postalCode}_${index}`,
			postinumero: postalCode,
			distance: Math.round(randomInRange(1, 100)),
			building_id: generateBuildingId(),
			tree_id: `TREE_${postalCode}_${Math.floor(Math.random() * 100)}`,
		},
	}
}

/**
 * Generate other nature surface polygons
 *
 * Creates polygons for non-tree natural surfaces like rocks,
 * sand, bare soil, and wetlands. Complements tree coverage data.
 *
 * @param {string} postalCode - Postal code
 * @param {PostalCodeCenter} center - Center coordinates
 * @param {number} index - Surface index
 * @returns {Object} GeoJSON Polygon Feature with nature surface properties
 */
function generateOtherNature(postalCode: string, center: { lat: number; lon: number }, index: number) {
	return {
		type: 'Feature',
		id: `NAT_${postalCode}_${index}`,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(
				center.lon + randomInRange(-0.008, 0.008),
				center.lat + randomInRange(-0.008, 0.008),
				0.0005 + Math.random() * 0.001
			),
		},
		properties: {
			id: `NAT_${postalCode}_${index}`,
			kohde_id: `NAT_${postalCode}_${index}`,
			postinumero: postalCode,
			koodi: randomChoice(['ROCK', 'SAND', 'BARE_SOIL', 'WETLAND']),
			kuvaus: 'Other nature surface',
			p_ala_m2: Math.round(randomInRange(50, 500)),
			kunta: 'Helsinki',
		},
	}
}

/**
 * Generate a travel time accessibility point
 *
 * Creates points with multi-modal travel time data (walk, bike,
 * public transport, car) for accessibility analysis.
 *
 * @param {number} index - Point index
 * @returns {Object} GeoJSON Point Feature with travel time data
 */
function generateTravelTime(index: number) {
	const fromId = 5970000 + index * 100
	const lon = randomInRange(24.8, 25.1)
	const lat = randomInRange(60.15, 60.3)

	return {
		type: 'Feature',
		id: `TT_${fromId}`,
		geometry: {
			type: 'Point',
			coordinates: [lon, lat],
		},
		properties: {
			id: `TT_${fromId}`,
			from_id: fromId,
			travel_data: JSON.stringify({
				walk: Math.floor(randomInRange(5, 60)),
				bike: Math.floor(randomInRange(3, 40)),
				public_transport: Math.floor(randomInRange(10, 90)),
				car: Math.floor(randomInRange(5, 45)),
			}),
		},
	}
}

// Main generation function
function generate() {
	console.log('\n  Mock Data Generator')
	console.log('  ===================\n')
	console.log(`  Buildings per postal code: ${BUILDINGS_PER_POSTAL}`)
	console.log(`  Postal codes: ${MAX_POSTAL_CODES || 'all'}\n`)

	if (!existsSync(FIXTURES_DIR)) {
		mkdirSync(FIXTURES_DIR, { recursive: true })
	}

	const postalCodes = Object.entries(POSTAL_CODES).slice(0, MAX_POSTAL_CODES || undefined)

	// Buildings
	console.log('  Generating buildings...')
	const buildings: ReturnType<typeof generateBuilding>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < BUILDINGS_PER_POSTAL; i++) {
			buildings.push(generateBuilding(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'buildings.json'),
		JSON.stringify({ type: 'FeatureCollection', features: buildings }, null, 2)
	)
	console.log(`    Created ${buildings.length} buildings`)

	// Heat exposure
	console.log('  Generating heat exposure areas...')
	const heatAreas: ReturnType<typeof generateHeatExposureArea>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < Math.ceil(BUILDINGS_PER_POSTAL / 5); i++) {
			heatAreas.push(generateHeatExposureArea(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'heatexposure.json'),
		JSON.stringify({ type: 'FeatureCollection', features: heatAreas }, null, 2)
	)
	console.log(`    Created ${heatAreas.length} heat exposure areas`)

	// Trees
	console.log('  Generating trees...')
	const trees: ReturnType<typeof generateTree>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < BUILDINGS_PER_POSTAL * 2; i++) {
			trees.push(generateTree(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'trees.json'),
		JSON.stringify({ type: 'FeatureCollection', features: trees }, null, 2)
	)
	console.log(`    Created ${trees.length} trees`)

	// Cold areas
	console.log('  Generating cold areas...')
	const coldAreas: ReturnType<typeof generateColdArea>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < Math.ceil(BUILDINGS_PER_POSTAL / 10); i++) {
			coldAreas.push(generateColdArea(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'coldarea.json'),
		JSON.stringify({ type: 'FeatureCollection', features: coldAreas }, null, 2)
	)
	console.log(`    Created ${coldAreas.length} cold areas`)

	// Urban heat buildings
	console.log('  Generating urban heat buildings...')
	const urbanHeatBuildings: ReturnType<typeof generateUrbanHeatBuilding>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < Math.ceil(BUILDINGS_PER_POSTAL / 2); i++) {
			urbanHeatBuildings.push(generateUrbanHeatBuilding(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'urban_heat_building.json'),
		JSON.stringify({ type: 'FeatureCollection', features: urbanHeatBuildings }, null, 2)
	)
	console.log(`    Created ${urbanHeatBuildings.length} urban heat buildings`)

	// Adaptation landcover
	console.log('  Generating adaptation landcover...')
	const landcover: ReturnType<typeof generateAdaptationLandcover>[] = []
	for (let i = 0; i < 500; i++) {
		landcover.push(generateAdaptationLandcover(i))
	}
	writeFileSync(
		join(FIXTURES_DIR, 'adaptation_landcover.json'),
		JSON.stringify({ type: 'FeatureCollection', features: landcover }, null, 2)
	)
	console.log(`    Created ${landcover.length} landcover areas`)

	// Tree building distance
	console.log('  Generating tree-building distances...')
	const treeBuildingDist: ReturnType<typeof generateTreeBuildingDistance>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < Math.ceil(BUILDINGS_PER_POSTAL / 2); i++) {
			treeBuildingDist.push(generateTreeBuildingDistance(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'tree_building_distance.json'),
		JSON.stringify({ type: 'FeatureCollection', features: treeBuildingDist }, null, 2)
	)
	console.log(`    Created ${treeBuildingDist.length} tree-building distances`)

	// Other nature
	console.log('  Generating other nature areas...')
	const otherNature: ReturnType<typeof generateOtherNature>[] = []
	for (const [code, center] of postalCodes) {
		for (let i = 0; i < Math.ceil(BUILDINGS_PER_POSTAL / 5); i++) {
			otherNature.push(generateOtherNature(code, center, i))
		}
	}
	writeFileSync(
		join(FIXTURES_DIR, 'othernature.json'),
		JSON.stringify({ type: 'FeatureCollection', features: otherNature }, null, 2)
	)
	console.log(`    Created ${otherNature.length} other nature areas`)

	// Travel time
	console.log('  Generating travel time data...')
	const travelTime: ReturnType<typeof generateTravelTime>[] = []
	for (let i = 0; i < 200; i++) {
		travelTime.push(generateTravelTime(i))
	}
	writeFileSync(
		join(FIXTURES_DIR, 'travel_time.json'),
		JSON.stringify({ type: 'FeatureCollection', features: travelTime }, null, 2)
	)
	console.log(`    Created ${travelTime.length} travel time entries`)

	// Population grid (simplified)
	console.log('  Generating population grid...')
	const popGrid: { type: string; id: string; geometry: object; properties: object }[] = []
	for (let i = 0; i < 100; i++) {
		popGrid.push({
			type: 'Feature',
			id: `POP_${i}`,
			geometry: {
				type: 'Polygon',
				coordinates: generatePolygon(
					randomInRange(24.7, 25.2),
					randomInRange(60.1, 60.35),
					0.005
				),
			},
			properties: {
				id: `POP_${i}`,
				population: Math.floor(randomInRange(100, 5000)),
				density: Math.floor(randomInRange(500, 10000)),
			},
		})
	}
	writeFileSync(
		join(FIXTURES_DIR, 'populationgrid.json'),
		JSON.stringify({ type: 'FeatureCollection', features: popGrid }, null, 2)
	)
	console.log(`    Created ${popGrid.length} population grid cells`)

	// Capital region postal codes
	console.log('  Generating capital region postal codes...')
	const postalCodeFeatures = Object.entries(POSTAL_CODES).map(([code, data]) => ({
		type: 'Feature',
		id: code,
		geometry: {
			type: 'Polygon',
			coordinates: generatePolygon(data.lon, data.lat, 0.015),
		},
		properties: {
			postinumero: code,
			nimi: data.name,
			kunta: code.startsWith('02') ? 'Espoo' : code.startsWith('01') ? 'Vantaa' : 'Helsinki',
		},
	}))
	writeFileSync(
		join(FIXTURES_DIR, 'capitalregion_postalcode.json'),
		JSON.stringify({ type: 'FeatureCollection', features: postalCodeFeatures }, null, 2)
	)
	console.log(`    Created ${postalCodeFeatures.length} postal code areas`)

	console.log('\n  Done! Fixtures saved to mock-api/fixtures/')
	console.log('  Start mock server with: cd mock-api && bun run dev\n')
}

generate()
