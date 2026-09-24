/**
 * @module constants/floodScenarios
 * SYKE flood hazard scenarios offered in the background map browser: WMS layer
 * ids, the SYKE service each is served from, and the legend for each family.
 *
 * This is the only module that names a scenario id or a legend colour
 * (`tests/unit/constants/floodScenarios.test.js`); BackgroundMapBrowser and
 * urlStore read from here.
 *
 * Layer ids match SYKE WMS GetCapabilities (checked 2026-09-23):
 * paikkatiedot.ymparisto.fi/geoserver `tulva`, `meritulvakartat_2022` and
 * `meritulvakartat_2022_yhdistelma`.
 */

/**
 * @typedef {'stormwater52mm' | 'stormwater80mm' | 'coastalBase' | 'coastalCombined'} SykeFloodService
 * Key of `urlStore.externalApis.syke.flood`
 */

/**
 * @typedef {Object} FloodScenario
 * @property {string} id - SYKE WMS layer name
 * @property {string} label - Button label
 * @property {SykeFloodService} service - SYKE service serving the layer
 */

/** @type {FloodScenario[]} Stormwater flood depth for extreme rainfall */
export const STORMWATER_SCENARIOS = [
	{
		id: 'HulevesitulvaVesisyvyysSade52mmMallinnettuAlue',
		label: '52mm/hour',
		service: 'stormwater52mm',
	},
	{
		id: 'HulevesitulvaVesisyvyysSade80mmMallinnettuAlue',
		label: '80mm/hour',
		service: 'stormwater80mm',
	},
]

/** @type {FloodScenario} Flood hazard areas of all emission pathways in one layer */
export const COMBINED_COASTAL_SCENARIO = {
	id: 'SSP585_re_with_SSP245_with_SSP126_with_current',
	label: 'Combined',
	service: 'coastalCombined',
}

export const COASTAL_YEARS = /** @type {const} */ ([2050, 2100])
export const COASTAL_PATHWAYS = /** @type {const} */ (['SSP126', 'SSP245', 'SSP585'])

/**
 * @typedef {FloodScenario & { pathway: string, year: number }} CoastalScenario
 * Sea-level scenario with a 1/20-year recurrence, flood-protected areas shown
 */

/**
 * @param {string} pathway - Emission pathway, e.g. 'SSP245'
 * @param {number} year - Scenario year, e.g. 2100
 * @returns {string} SYKE layer id
 */
export const coastalScenarioId = (pathway, year) =>
	`coastal_flood_${pathway}_${year}_0020_with_protected`

/** @type {CoastalScenario[]} */
export const COASTAL_SCENARIOS = COASTAL_YEARS.flatMap((year) =>
	COASTAL_PATHWAYS.map((pathway) => ({
		id: coastalScenarioId(pathway, year),
		label: pathway,
		pathway,
		year,
		service: /** @type {SykeFloodService} */ ('coastalBase'),
	}))
)

/** @type {FloodScenario[]} Every scenario the browser offers */
export const FLOOD_SCENARIOS = [
	...STORMWATER_SCENARIOS,
	COMBINED_COASTAL_SCENARIO,
	...COASTAL_SCENARIOS,
]

/**
 * @param {string} id - SYKE layer id
 * @returns {FloodScenario | undefined}
 */
export const findFloodScenario = (id) => FLOOD_SCENARIOS.find((s) => s.id === id)

/**
 * @typedef {{ color: string, text: string }} LegendItem
 */

/** @type {Record<'stormwater' | 'coastal' | 'combination', LegendItem[]>} */
export const FLOOD_LEGENDS = {
	stormwater: [
		{ color: '#82CFFF', text: 'Water/sea area' },
		{ color: '#4589FF', text: '0.1 m' },
		{ color: '#0F62FE', text: '0.3 m' },
		{ color: '#0059C9', text: '0.5 m' },
		{ color: '#002A8E', text: '1 m' },
		{ color: '#001141', text: '2+ m' },
	],
	coastal: [
		{ color: '#7ecce6', text: 'Less than 0.5 m' },
		{ color: '#5498cc', text: '0.5-1 m' },
		{ color: '#2b66b3', text: '1-2 m' },
		{ color: '#003399', text: '2-3 m' },
		{ color: '#002673', text: 'More than 3 m' },
		{ color: '#fddbc6', text: 'Flood-protected areas' },
		{ color: '#d2ffff', text: 'Sea area' },
	],
	combination: [
		{ color: '#002a8e', text: 'Current situation (2020)' },
		{ color: '#0f62fe', text: 'Year 2100, low = SSP1-2.6' },
		{ color: '#b2192b', text: 'Year 2100, medium = SSP2-4.5' },
		{ color: '#fde9dc', text: 'Year 2100, high = SSP5-8.5' },
	],
}

/**
 * @param {string | null | undefined} id - SYKE layer id, or 'none'
 * @returns {LegendItem[]}
 */
export const floodLegendFor = (id) => {
	const scenario = id ? findFloodScenario(id) : undefined
	if (!scenario) return []
	if (scenario.service === 'coastalCombined') return FLOOD_LEGENDS.combination
	if (scenario.service === 'coastalBase') return FLOOD_LEGENDS.coastal
	return FLOOD_LEGENDS.stormwater
}

/** Licence attribution SYKE requires for its open data (CC BY 4.0) */
export const SYKE_ATTRIBUTION = {
	credit: '© Finnish Environment Institute (Syke), CC BY 4.0',
	sourceName: 'Finnish Environment Institute (Syke)',
	sourceUrl: 'https://www.syke.fi/en',
	licenseName: 'CC BY 4.0',
	licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
}
