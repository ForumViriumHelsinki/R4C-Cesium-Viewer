/**
 * scripts/overflow-targets.mjs picks the panels the layout-overflow check runs
 * for. A panel it fails to map is never checked, and nothing else notices.
 */
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	isMain,
	registryComponents,
	SHELL_ROOTS,
	selectPanels,
	shellComponents,
} from '../../../scripts/overflow-targets.mjs'
import { ANALYSES } from '../../../src/constants/analysisRegistry.js'
import { reachableFrom } from '../contracts/sourceGraph.js'

const components = registryComponents(readFileSync('src/constants/analysisRegistry.js', 'utf8'))
const panelFiles = new Map([...components].map(([id, files]) => [id, reachableFrom(files)]))
const shell = shellComponents(reachableFrom(SHELL_ROOTS), panelFiles)

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

	it('selects every panel when a component the shell renders, and no panel reaches, changes', () => {
		// AnalysisEntryList and ChartCard wrap every panel; DataLayersControl sits
		// in the Layers tab the detector scans.
		for (const file of [
			'src/components/AnalysisEntryList.vue',
			'src/components/ChartCard.vue',
			'src/components/controls/DataLayersControl.vue',
		]) {
			expect(selectPanels([file], panelFiles, shell), file).toBe('all')
		}
		// A panel's own component stays targeted, although the shell reaches it too.
		expect(selectPanels(['src/components/Timeline.vue'], panelFiles, shell)).toEqual([
			'building-heat',
		])
	})

	it('recognises itself as the main module under a path that needs URL-encoding', () => {
		// A raw `file://${path}` comparison was false here, so main() never ran and
		// the check reported "nothing to check".
		const script = '/home/ci/my checkout/scripts/overflow-targets.mjs'
		expect(isMain(pathToFileURL(script).href, script)).toBe(true)
		expect(isMain(pathToFileURL(script).href, '/home/ci/other.mjs')).toBe(false)
		expect(isMain(pathToFileURL(script).href, undefined)).toBe(false)
	})

	it('selects nothing for a change no panel reaches', () => {
		expect(selectPanels(['README.md', 'docs/adr/ADR-001.md'], panelFiles)).toEqual([])
	})
})
