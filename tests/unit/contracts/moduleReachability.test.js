/**
 * Every module in `src/` must be reachable from `src/main.js`.
 *
 * An unmounted component still type-checks, still turns up in code search, and
 * reads as live code. VulnerabilityChart, SurveyScatterPlot, BuildingTreeChart
 * and NearbyTreeArea sat on disk for almost two years after their parents
 * stopped mounting them (#979, #980, #981); `knip --include files` did not
 * report them. Components are auto-registered by `unplugin-vue-components`, so
 * `sourceGraph.js` follows template tags as well as imports.
 *
 * A module that is deliberately unreachable goes in ALLOWED_UNREACHABLE with
 * the reason. An entry whose file no longer exists is ignored, so that a
 * sibling PR deleting the file does not break this test; remove it when you
 * next edit the list.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSourceGraph, ROOT } from './sourceGraph.js'

const ALLOWED_UNREACHABLE = {
	'src/components/FloodBackgroundSyke.vue':
		'#982: deleted once BackgroundMapBrowser has the 2100 scenarios and Syke attribution',
	'src/components/GraphicsQuality.vue':
		'#983: deleted once graphicsStore is driven from the GOFF graphics flags',
	'src/services/loadingCoordinator.js': 'never wired into the app; adopt or delete (follow-up)',
	'src/constants/performance.js': 'never imported; adopt or delete (follow-up)',
	'src/utils/entityHelpers.js': 'imported only by its unit test; adopt or delete (follow-up)',
	'src/utils/wmsRequestCache.js':
		'imported only by its unit test, though docs/WMS_REQUEST_OPTIMIZATION.md describes it as active; wire in or delete (follow-up)',
}

const { files, reachable } = buildSourceGraph()

describe('module reachability from src/main.js', { tags: ['@unit'] }, () => {
	it('control: reaches modules through each kind of edge', () => {
		expect(files.length).toBeGreaterThan(100)
		expect(reachable).toContain('src/stores/globalStore.js') // static import
		expect(reachable).toContain('src/services/cesiumSymbols.js') // dynamic import()
		expect(reachable).toContain('src/workers/geojsonParser.worker.js') // new URL(…, import.meta.url)
		expect(reachable).toContain('src/components/DataSourceStatusBadge.vue') // template tag only
	})

	it('reaches every module that is not allowlisted', () => {
		const unreachable = files.filter((f) => !reachable.has(f) && !(f in ALLOWED_UNREACHABLE))
		expect(unreachable).toEqual([])
	})

	it('allowlists only modules that are still unreachable', () => {
		const stale = Object.keys(ALLOWED_UNREACHABLE).filter(
			(f) => existsSync(join(ROOT, f)) && reachable.has(f)
		)
		expect(stale).toEqual([])
	})
})
