/**
 * Sentry's Pinia plugin calls `stateTransformer(states)` with ONE argument: a
 * map of every store's state keyed by store id (@sentry/vue pinia.js,
 * getAllStoreStates). The transformer used to declare `(state, store)` and read
 * `store.$id`, which threw; the plugin swallows the throw and falls back to the
 * untransformed states, so the Cesium viewer and the 13k-feature VTT flood frame
 * reached Sentry's scope context on every store action.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSentryPiniaPlugin, getCurrentScope, getGlobalScope } from '@sentry/vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createApp, markRaw } from 'vue'
import {
	SENTRY_EXCLUDED_STATE_FIELDS,
	SENTRY_PINIA_PLUGIN_OPTIONS,
	sentryStateTransformer,
} from '@/utils/sentryStateTransformer.js'

function allStoreStates() {
	return {
		global: {
			cesiumViewer: { circular: true },
			currentGridCell: {},
			pickedEntity: {},
			level: 'start',
		},
		props: { postalCodeData: { entities: [] }, statsIndex: 'heat_index' },
		backgroundMap: {
			floodLayers: [{}],
			landcoverLayers: [{}],
			tiffLayers: [{}],
			hSYWMSLayers: [{}],
			opacity: 1,
		},
		vttFlood: { frame: { values: {} }, scenarioId: '1', dimension: 'transpiration' },
		toggle: { showTrees: false },
	}
}

describe('sentryStateTransformer', () => {
	it('takes the single all-stores map Sentry passes and strips the excluded fields', () => {
		const out = sentryStateTransformer(allStoreStates())

		expect(out.global).toEqual({ level: 'start' })
		expect(out.props).toEqual({ statsIndex: 'heat_index' })
		expect(out.backgroundMap).toEqual({ opacity: 1 })
		expect(out.vttFlood).toEqual({ scenarioId: '1', dimension: 'transpiration' })
		expect(out.toggle).toEqual({ showTrees: false })
	})

	it('excludes the VTT flood frame', () => {
		expect(SENTRY_EXCLUDED_STATE_FIELDS.vttFlood).toContain('frame')
	})

	it('does not mutate the store states it is given', () => {
		const states = allStoreStates()
		sentryStateTransformer(states)
		expect(states.vttFlood.frame).toBeDefined()
		expect(states.global.cesiumViewer).toBeDefined()
	})

	it('tolerates stores that have not been created yet', () => {
		expect(() => sentryStateTransformer({ toggle: { showTrees: true } })).not.toThrow()
		expect(sentryStateTransformer({ toggle: { showTrees: true } })).toEqual({
			toggle: { showTrees: true },
		})
	})

	it('produces JSON-serializable output once the Cesium-holding fields are gone', () => {
		const states = allStoreStates()
		const viewer = { name: 'viewer' }
		viewer.self = viewer
		states.global.cesiumViewer = viewer
		expect(() => JSON.stringify(sentryStateTransformer(states))).not.toThrow()
	})
})

/**
 * The transformer above is only half the fix: main.js must hand it to the real
 * plugin. These tests run @sentry/vue's createSentryPiniaPlugin with the
 * options main.js uses, so going back to an inline `(state, store)` transformer
 * fails here and not only in production.
 */
describe('Sentry Pinia plugin options', () => {
	/** Install the real plugin on a fresh Pinia and run one vttFlood action. */
	function runVttFloodAction() {
		const pinia = createPinia()
		pinia.use(createSentryPiniaPlugin(SENTRY_PINIA_PLUGIN_OPTIONS))
		// Pinia queues plugins until it is installed on an app.
		createApp({}).use(pinia)
		setActivePinia(pinia)
		const viewer = { name: 'viewer' }
		viewer.self = viewer
		const useGlobal = defineStore('global', {
			state: () => ({ cesiumViewer: markRaw(viewer), level: 'start' }),
		})
		const useVttFlood = defineStore('vttFlood', {
			state: () => ({ frame: markRaw({ values: { transpiration: [1, 2] } }), dimension: 'a' }),
			actions: {
				setDimension(key) {
					this.dimension = key
				},
			},
		})
		useGlobal()
		const before = getGlobalScope().getScopeData().eventProcessors.length
		useVttFlood().setDimension('transpiration')
		return { before, after: getGlobalScope().getScopeData().eventProcessors.length }
	}

	it('keeps the VTT frame and the Cesium viewer out of the scope context', () => {
		runVttFloodAction()
		const { state } = getCurrentScope().getScopeData().contexts.state
		expect(state.type).toBe('pinia')
		expect(state.value.vttFlood).toEqual({ dimension: 'transpiration' })
		expect(state.value.global).toEqual({ level: 'start' })
	})

	it('does not attach all store state to every error event', () => {
		// The attachment JSON.stringify's every store on each sampled error. It
		// never reached Sentry while the transformer threw (the viewer is
		// circular), so turning it off keeps the behaviour production had.
		const { before, after } = runVttFloodAction()
		expect(after).toBe(before)
	})

	it('is the configuration main.js installs', () => {
		const mainJs = readFileSync(join(__dirname, '../../../src/main.js'), 'utf8')
		expect(mainJs).toMatch(/createSentryPiniaPlugin\(\s*SENTRY_PINIA_PLUGIN_OPTIONS\s*\)/)
	})
})
