/**
 * Sentry's Pinia plugin calls `stateTransformer(states)` with ONE argument: a
 * map of every store's state keyed by store id (@sentry/vue pinia.js,
 * getAllStoreStates). The transformer used to declare `(state, store)` and read
 * `store.$id`, which threw; the plugin swallows the throw and falls back to the
 * untransformed states, so the Cesium viewer and the 13k-feature VTT flood frame
 * reached Sentry's scope context on every store action.
 */
import { describe, expect, it } from 'vitest'
import {
	SENTRY_EXCLUDED_STATE_FIELDS,
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
