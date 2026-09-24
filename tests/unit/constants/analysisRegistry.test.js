/**
 * The analysis registry replaced hand-written v-if conditions in
 * ControlPanel.vue. `legacyVisible` restates those conditions verbatim, and
 * the registry must agree with it across every level/view/flag/data state.
 * Grid Options and Climate Adaptation later moved to the Layers tab without
 * changing when they appear, so the oracle is split by tab.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('vue', async (importOriginal) => {
	const actual = await importOriginal()
	return { ...actual, defineAsyncComponent: (loader) => ({ __asyncLoader: loader }) }
})

const { ANALYSES, analysisTitle, findAnalysis, isAnalysisAvailable } = await import(
	'@/constants/analysisRegistry.js'
)

// ControlPanel.vue template conditions before the registry (#978 base)
const legacyVisible = ({ level, view, flags, statsIndex, socioEconomicsReady }) => {
	const on = (f) => flags.has(f)
	const out = []
	if (level === 'postalCode') {
		if (on('heatHistogram')) out.push('Heat Distribution')
		if (socioEconomicsReady && on('socioeconomicViz')) out.push('Socioeconomics')
		if (view !== 'helsinki' && on('landCover')) out.push('Land Cover')
		if (on('buildingScatterPlot')) out.push('Building Analysis')
		if (on('ndviAnalysis')) out.push('NDVI Vegetation')
	}
	if (level === 'building') out.push('Building Heat Data')
	const layers = []
	if (view === 'grid') {
		if (statsIndex === 'heat_index' && on('coolingOptimizer')) layers.push('Climate Adaptation')
		layers.push('Grid Options')
	}
	return { analysis: out, layers }
}

const FLAGS = [
	'heatHistogram',
	'socioeconomicViz',
	'landCover',
	'buildingScatterPlot',
	'ndviAnalysis',
	'coolingOptimizer',
]

const subsets = (items) =>
	items.reduce((acc, item) => acc.concat(acc.map((set) => [...set, item])), [[]])

describe('analysisRegistry', { tags: ['@unit'] }, () => {
	it('matches the pre-registry ControlPanel conditions in every state', () => {
		let states = 0
		for (const level of ['start', 'postalCode', 'building']) {
			for (const view of ['capitalRegion', 'grid', 'helsinki']) {
				for (const flagList of subsets(FLAGS)) {
					for (const statsIndex of ['heat_index', 'population']) {
						for (const socioEconomicsReady of [true, false]) {
							const flags = new Set(flagList)
							const ctx = {
								level,
								view,
								isEnabled: (f) => flags.has(f),
								statsIndex,
								socioEconomicsReady,
							}
							const available = ANALYSES.filter((e) => isAnalysisAvailable(e, ctx))
							const byTab = (tab) => available.filter((e) => e.tab === tab).map((e) => e.label)
							const expected = legacyVisible({
								level,
								view,
								flags,
								statsIndex,
								socioEconomicsReady,
							})
							const label = JSON.stringify({
								level,
								view,
								flagList,
								statsIndex,
								socioEconomicsReady,
							})
							expect(byTab('analysis'), label).toEqual(expected.analysis)
							expect(byTab('layers'), label).toEqual(expected.layers)
							states++
						}
					}
				}
			}
		}
		expect(states).toBe(3 * 3 * 64 * 2 * 2)
	})

	it('keeps the accessible names E2E specs locate by', () => {
		expect(ANALYSES.map((e) => e.label)).toEqual([
			'Heat Distribution',
			'Socioeconomics',
			'Land Cover',
			'Building Analysis',
			'NDVI Vegetation',
			'Building Heat Data',
			'Climate Adaptation',
			'Grid Options',
		])
	})

	it('opens writes and tool analyses only where the map stays visible (ADR-009, ADR-010)', () => {
		// Whether the 3D map stays visible and clickable beside each placement on
		// desktop. A placement missing here fails for every entry, so a new one
		// (such as the ADR-010 workspace) has to be classified before use.
		const MAP_VISIBLE = { inline: true, drawer: true, expansion: true }
		for (const entry of ANALYSES) {
			expect(Object.hasOwn(MAP_VISIBLE, entry.placement), `${entry.id}: ${entry.placement}`).toBe(
				true
			)
			if (entry.mapCoupling === 'writes' || entry.mapCoupling === 'tool') {
				expect(MAP_VISIBLE[entry.placement], `${entry.id} hides the map`).toBe(true)
			}
		}
	})

	it('lists map tools in the Layers tab and analyses in the Analysis tab', () => {
		for (const entry of ANALYSES) {
			expect(entry.tab).toBe(entry.mapCoupling === 'tool' ? 'layers' : 'analysis')
		}
	})

	it('has unique ids that findAnalysis resolves', () => {
		const ids = ANALYSES.map((e) => e.id)
		expect(new Set(ids).size).toBe(ids.length)
		for (const id of ids) expect(findAnalysis(id)?.id).toBe(id)
		expect(findAnalysis('missing')).toBeUndefined()
	})

	it('resolves per-view component variants', () => {
		const scatter = findAnalysis('scatter-plot')
		expect(scatter.component('helsinki')).not.toBe(scatter.component('capitalRegion'))
		const heat = findAnalysis('building-heat')
		const variants = new Set(['grid', 'helsinki', 'capitalRegion'].map((v) => heat.component(v)))
		expect(variants.size).toBe(3)
	})

	it('falls back to the label when no title is set', () => {
		expect(analysisTitle(findAnalysis('heat-histogram'))).toBe('Heat Distribution')
		expect(analysisTitle(findAnalysis('socioeconomics'))).toBe('Socioeconomic Analysis')
	})
})
