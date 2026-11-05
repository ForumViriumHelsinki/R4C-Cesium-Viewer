/**
 * scripts/overflow-targets.mjs picks the panels the layout-overflow check runs
 * for. A panel it fails to map is never checked, and nothing else notices.
 */
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { registryComponents, selectPanels } from '../../../scripts/overflow-targets.mjs'
import { ANALYSES } from '../../../src/constants/analysisRegistry.js'
import { reachableFrom } from '../contracts/sourceGraph.js'

const components = registryComponents(readFileSync('src/constants/analysisRegistry.js', 'utf8'))
const panelFiles = new Map([...components].map(([id, files]) => [id, reachableFrom(files)]))

describe('overflow-targets', () => {
	it('maps every registry entry to component files that exist', () => {
		expect([...components.keys()].sort()).toEqual(ANALYSES.map((e) => e.id).sort())
		for (const [id, files] of components) {
			expect(files.length, `${id} has no component files`).toBeGreaterThan(0)
			for (const file of files) expect(existsSync(file), `${id}: ${file}`).toBe(true)
		}
	})

	it('maps each view-specific component of an entry', () => {
		expect(components.get('building-heat')).toEqual([
			'src/components/BuildingGridChart.vue',
			'src/components/BuildingHeatChart.vue',
			'src/components/HSYBuildingHeatChart.vue',
		])
	})

	it('selects the panel whose components reach a changed file', () => {
		// Timeline.vue is a child of HSYBuildingHeatChart (#1095); CoolingCenter.vue
		// is rendered by a template tag in ClimateAdaptationPanel (#1103).
		expect(selectPanels(['src/components/Timeline.vue'], panelFiles)).toEqual(['building-heat'])
		expect(selectPanels(['src/components/CoolingCenter.vue'], panelFiles)).toEqual([
			'climate-adaptation',
		])
	})

	it('selects every panel when the shared shell changes', () => {
		expect(selectPanels(['src/pages/ControlPanel.vue'], panelFiles)).toBe('all')
		expect(selectPanels(['src/styles/settings.scss'], panelFiles)).toBe('all')
	})

	it('selects nothing for a change no panel reaches', () => {
		expect(selectPanels(['README.md', 'docs/adr/ADR-001.md'], panelFiles)).toEqual([])
	})
})
