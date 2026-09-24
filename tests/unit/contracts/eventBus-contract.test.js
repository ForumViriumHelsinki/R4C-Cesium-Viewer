/**
 * Every `eventBus` event must have both ends in live code.
 *
 * The 2024 control-panel refactors unmounted the components that listened for
 * `createHeatFloodVulnerabilityChart`, `newNearbyTreeDiagram` and the
 * show/hide level events, and #984 deleted them, but their emitters kept
 * running (#979, #980, #981). mitt drops an event nobody listens for without a
 * sound, so nothing reported it. This test does: an emit with no listener, or a
 * listener with no emit, in modules reachable from `src/main.js` fails here.
 *
 * Calls in unreachable modules are ignored; `moduleReachability.test.js` fails
 * on those modules instead.
 */
import { describe, expect, it } from 'vitest'
import { buildSourceGraph } from './sourceGraph.js'

const { eventCalls, reachable } = buildSourceGraph()
const live = eventCalls.filter((call) => reachable.has(call.file))
const namesOf = (methods) =>
	new Set(live.filter((c) => methods.includes(c.method)).flatMap((c) => c.names))
const emitted = namesOf(['emit'])
const listened = namesOf(['on', 'once'])
const where = (call, name) => `${name} (${call.file}:${call.line})`

describe('eventBus contract', { tags: ['@unit'] }, () => {
	it('control: the scan finds live emit/listen pairs', () => {
		expect(live.length).toBeGreaterThan(10)
		// buildingFilter.js emits, HeatHistogram.vue listens
		expect(emitted).toContain('newHeatHistogram')
		expect(listened).toContain('newHeatHistogram')
		// The JSDoc examples in eventEmitter.js are comments, not calls
		expect(emitted).not.toContain('dataLoaded')
	})

	it('names every event with string literals, so the scan can see it', () => {
		const dynamic = live.filter((c) => c.names.length === 0).map((c) => `${c.file}:${c.line}`)
		expect(dynamic).toEqual([])
	})

	it('has a listener for every emitted event', () => {
		const orphans = live
			.filter((c) => c.method === 'emit')
			.flatMap((c) => c.names.filter((n) => !listened.has(n)).map((n) => where(c, n)))
		expect(orphans).toEqual([])
	})

	it('has an emitter for every listened event', () => {
		const orphans = live
			.filter((c) => c.method === 'on' || c.method === 'once')
			.flatMap((c) => c.names.filter((n) => !emitted.has(n)).map((n) => where(c, n)))
		expect(orphans).toEqual([])
	})
})
