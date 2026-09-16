// src/constants/analysisRegistry.js
// Single source for the Analysis tab: which analyses exist, when each is
// offered, how it is presented, and which component renders it. See
// docs/adr/ADR-009-analysis-registry.md.
import { defineAsyncComponent } from 'vue'

/**
 * Navigation level, as stored in `globalStore.level`. Note the camelCase
 * `'postalCode'`; the URL form is lowercase `postalcode` (see useUrlState).
 * @typedef {'start' | 'postalCode' | 'building'} NavigationLevel
 */

/**
 * View mode, as stored in `globalStore.view`. `'helsinki'` is still branched on
 * by several components although no current UI path sets it.
 * @typedef {'capitalRegion' | 'grid' | 'helsinki'} ViewMode
 */

/**
 * How an analysis relates to the 3D map. Decides where it may be placed:
 * - `none`   - reads only store data; may open anywhere, including full-page
 * - `reads`  - reads map selection state; may open full-page
 * - `writes` - clicks or selections change the map; must open where the map
 *              stays visible and clickable
 * - `tool`   - edits or explains map layers; never leaves the map
 * @typedef {'none' | 'reads' | 'writes' | 'tool'} MapCoupling
 */

/**
 * Presentation surface:
 * - `inline`    - card in the sidebar below the analysis buttons
 * - `drawer`    - right-side AnalysisPanel drawer
 * - `expansion` - expansion panel in the sidebar, rendered in place of a button
 * @typedef {'inline' | 'drawer' | 'expansion'} Placement
 */

/**
 * Inputs to availability that are not level, view or feature flags.
 * @typedef {Object} AnalysisContext
 * @property {NavigationLevel} level
 * @property {ViewMode} view
 * @property {(flag: import('./flagMetadata').FeatureFlagName) => boolean} isEnabled
 * @property {string} statsIndex - `propsStore.statsIndex`
 * @property {boolean} socioEconomicsReady - socioeconomic and heat exposure data both loaded
 */

/**
 * @typedef {Object} AnalysisEntry
 * @property {string} id - Stable key, used by openAnalysis() and AnalysisPanel
 * @property {string} label - Button text. E2E specs locate buttons by this
 *   accessible name, so changing it breaks tests/e2e contracts.
 * @property {string} [title] - Card header; defaults to `label`
 * @property {string} icon - MDI icon name
 * @property {NavigationLevel[]} levels - Levels the analysis is offered at
 * @property {ViewMode[] | null} views - Views it is offered in; `null` for any
 * @property {import('./flagMetadata').FeatureFlagName | null} flag - Gating feature flag
 * @property {((ctx: AnalysisContext) => boolean) | null} requires - Extra
 *   precondition, e.g. data that must be loaded before the analysis can render
 * @property {MapCoupling} mapCoupling
 * @property {Placement} placement
 * @property {(view: ViewMode) => import('vue').Component} component - Resolves
 *   the rendering component; views with a different implementation branch here
 */

// Components stay lazy per ADR-005: none of these chunks load until opened.
const HeatHistogram = defineAsyncComponent(() => import('../components/HeatHistogram.vue'))
const SocioEconomicsPanel = defineAsyncComponent(
	() => import('../components/SocioEconomicsPanel.vue')
)
const LandcoverPanel = defineAsyncComponent(() => import('../components/LandcoverPanel.vue'))
const BuildingScatterPlotPanel = defineAsyncComponent(
	() => import('../components/BuildingScatterPlotPanel.vue')
)
const Scatterplot = defineAsyncComponent(() => import('../components/Scatterplot.vue'))
const NDVIPanel = defineAsyncComponent(() => import('../components/NDVIPanel.vue'))
const BuildingGridChart = defineAsyncComponent(() => import('../components/BuildingGridChart.vue'))
const BuildingHeatChart = defineAsyncComponent(() => import('../components/BuildingHeatChart.vue'))
const HSYBuildingHeatChart = defineAsyncComponent(
	() => import('../components/HSYBuildingHeatChart.vue')
)
const ClimateAdaptationPanel = defineAsyncComponent(
	() => import('../components/ClimateAdaptationPanel.vue')
)
const StatisticalGridOptions = defineAsyncComponent(
	() => import('../components/StatisticalGridOptions.vue')
)

/** Listed in display order. @type {readonly AnalysisEntry[]} */
export const ANALYSES = Object.freeze([
	{
		id: 'heat-histogram',
		label: 'Heat Distribution',
		icon: 'mdi-chart-histogram',
		levels: ['postalCode'],
		views: null,
		flag: 'heatHistogram',
		requires: null,
		mapCoupling: 'writes',
		placement: 'inline',
		component: () => HeatHistogram,
	},
	{
		id: 'socioeconomics',
		label: 'Socioeconomics',
		title: 'Socioeconomic Analysis',
		icon: 'mdi-account-group',
		levels: ['postalCode'],
		views: null,
		flag: 'socioeconomicViz',
		requires: (ctx) => ctx.socioEconomicsReady,
		mapCoupling: 'none',
		placement: 'drawer',
		component: () => SocioEconomicsPanel,
	},
	{
		id: 'landcover',
		label: 'Land Cover',
		icon: 'mdi-leaf',
		levels: ['postalCode'],
		views: ['capitalRegion', 'grid'],
		flag: 'landCover',
		requires: null,
		mapCoupling: 'writes',
		placement: 'inline',
		component: () => LandcoverPanel,
	},
	{
		id: 'scatter-plot',
		label: 'Building Analysis',
		icon: 'mdi-chart-scatter-plot',
		levels: ['postalCode'],
		views: null,
		flag: 'buildingScatterPlot',
		requires: null,
		mapCoupling: 'writes',
		placement: 'drawer',
		component: (view) => (view === 'helsinki' ? Scatterplot : BuildingScatterPlotPanel),
	},
	{
		id: 'ndvi-analysis',
		label: 'NDVI Vegetation',
		icon: 'mdi-leaf',
		levels: ['postalCode'],
		views: null,
		flag: 'ndviAnalysis',
		requires: null,
		mapCoupling: 'writes',
		placement: 'drawer',
		component: () => NDVIPanel,
	},
	{
		id: 'building-heat',
		label: 'Building Heat Data',
		icon: 'mdi-thermometer',
		levels: ['building'],
		views: null,
		flag: null,
		requires: null,
		mapCoupling: 'reads',
		placement: 'inline',
		component: (view) =>
			view === 'grid'
				? BuildingGridChart
				: view === 'helsinki'
					? BuildingHeatChart
					: HSYBuildingHeatChart,
	},
	{
		id: 'climate-adaptation',
		label: 'Climate Adaptation',
		icon: 'mdi-shield-sun',
		levels: ['start', 'postalCode', 'building'],
		views: ['grid'],
		flag: 'coolingOptimizer',
		requires: (ctx) => ctx.statsIndex === 'heat_index',
		mapCoupling: 'tool',
		placement: 'expansion',
		component: () => ClimateAdaptationPanel,
	},
	{
		id: 'grid-options',
		label: 'Grid Options',
		icon: 'mdi-grid',
		levels: ['start', 'postalCode', 'building'],
		views: ['grid'],
		flag: null,
		requires: null,
		mapCoupling: 'tool',
		placement: 'inline',
		component: () => StatisticalGridOptions,
	},
])

/**
 * Whether an analysis is offered in the given context.
 * @param {AnalysisEntry} entry
 * @param {AnalysisContext} ctx
 * @returns {boolean}
 */
export const isAnalysisAvailable = (entry, ctx) =>
	entry.levels.includes(ctx.level) &&
	(entry.views === null || entry.views.includes(ctx.view)) &&
	(entry.flag === null || ctx.isEnabled(entry.flag)) &&
	(entry.requires === null || entry.requires(ctx))

/**
 * @param {string} id
 * @returns {AnalysisEntry | undefined}
 */
export const findAnalysis = (id) => ANALYSES.find((entry) => entry.id === id)

/**
 * @param {AnalysisEntry} entry
 * @returns {string}
 */
export const analysisTitle = (entry) => entry.title ?? entry.label
