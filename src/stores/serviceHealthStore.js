/**
 * @module stores/serviceHealthStore
 *
 * Surfaces upstream service degradation (driven by the per-host circuit
 * breaker) to the UI as a non-blocking notice. When the breaker for an HSY
 * map-data host opens, this store flips `isAnyServiceDegraded` true so a
 * snackbar can tell the user "HSY map layers temporarily unavailable"; when the
 * breaker recovers (half-open probe succeeds, or cooldown elapses) the notice
 * clears automatically.
 *
 * Follows the store-init-gating pattern (see code-quality.md): components gate
 * the notice on BOTH `initialized` AND the degraded flag so nothing flashes
 * before `init()` has wired up the breaker subscription.
 *
 * @see {@link module:services/hostCircuitBreaker}
 */

import { defineStore } from 'pinia'
import { getDegradedHostKeys, onBreakerChange } from '../services/hostCircuitBreaker.js'
import logger from '../utils/logger.js'

/**
 * Host keys (as produced by extractHostKey) that map to HSY map data. The HSY
 * landcover WMS proxies under `/wms/proxy` (key `wms`); HSY building tiles come
 * from pygeoapi (`pygeoapi` / `pygeoapi.dataportal.fi`); legacy direct hosts.
 */
const HSY_HOST_KEYS = new Set([
	'wms',
	'pygeoapi',
	'pygeoapi.dataportal.fi',
	'hsy-action',
	'kartta.hsy.fi',
])

export const useServiceHealthStore = defineStore('serviceHealth', {
	state: () => ({
		/** Flipped true once init() has subscribed to breaker events. */
		initialized: false,
		/** @type {string[]} Host keys whose circuit breaker is currently open. */
		degradedHostKeys: [],
		/** @type {(() => void)|null} Breaker unsubscribe handle. */
		_unsubscribe: null,
	}),

	getters: {
		/** Any upstream host is currently degraded. */
		isAnyServiceDegraded: (state) => state.degradedHostKeys.length > 0,

		/** Specifically an HSY map-data host is degraded. */
		isHsyDegraded: (state) => state.degradedHostKeys.some((key) => HSY_HOST_KEYS.has(key)),

		/** User-facing notice text, or '' when healthy. */
		degradedMessage: (state) => {
			if (state.degradedHostKeys.length === 0) return ''
			return 'HSY map layers are temporarily unavailable. The rest of the app keeps working; retrying automatically…'
		},
	},

	actions: {
		/**
		 * Wire up the breaker subscription. Idempotent — safe to call once on
		 * app mount. Reads current degraded state immediately so a breaker that
		 * opened before mount is reflected.
		 */
		init() {
			if (this._unsubscribe) return
			this.refresh()
			this._unsubscribe = onBreakerChange(() => this.refresh())
			this.initialized = true
			logger.debug('[serviceHealthStore] initialized')
		},

		/** Recompute degraded host list from the breaker. */
		refresh() {
			this.degradedHostKeys = getDegradedHostKeys()
		},

		/**
		 * Tear down the subscription. Call on app unmount / in test cleanup to
		 * avoid leaking a listener into the module-level breaker registry.
		 */
		teardown() {
			if (this._unsubscribe) {
				this._unsubscribe()
				this._unsubscribe = null
			}
			this.initialized = false
			this.degradedHostKeys = []
		},
	},
})
