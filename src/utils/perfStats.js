/// <reference types="vite/client" />
/**
 * @module utils/perfStats
 *
 * Dev/E2E-gated performance counters for bottleneck attribution.
 *
 * Exposes a flat, JSON-serializable counter object on `window.__perfStats`
 * (in dev and E2E builds only) so a measurement harness — human or browser
 * agent — can read durable evidence after a scripted interaction:
 *
 *   JSON.stringify(window.__perfStats)        // snapshot counters
 *   window.__perfStats.reset()                // zero between trials
 *
 * Three subsystems are instrumented (see call sites):
 * - `limiter`: per-host queue-wait time injected by the 3-concurrent cap in
 *   {@link module:services/hostConcurrencyLimiter}.
 * - `cache`: hit/miss counts, bytes served from IndexedDB vs the network, and
 *   cumulative JSON deserialize time — {@link module:services/cacheService}
 *   and {@link module:services/unifiedLoader}.
 * - `render`: how many times `viewer.scene.requestRender()` fired (patched once
 *   at viewer init in {@link module:composables/useViewerInitialization}).
 *
 * Gating: {@link PERF_STATS_ENABLED} is computed once at module load. It is true
 * in dev (`import.meta.env.DEV`) and in any E2E build (`VITE_E2E_TEST=true`),
 * and false in a production build — where it folds to a static `false` so the
 * guarded call sites (`if (PERF_STATS_ENABLED) perfStats.recordX(...)`) become
 * dead code the bundler can drop. When disabled, no recorder runs, nothing is
 * allocated per request, and nothing is logged: zero behaviour change.
 */

/**
 * Whether perf counters are active. Evaluated once; statically replaced by
 * Vite so the production build can tree-shake the guarded call sites.
 *
 * @type {boolean}
 */
export const PERF_STATS_ENABLED =
	import.meta.env.DEV === true || import.meta.env.VITE_E2E_TEST === 'true'

/**
 * Per-host limiter counters.
 * @typedef {Object} LimiterHostStats
 * @property {number} acquired - Total slots acquired (fast path + queued).
 * @property {number} queuedCount - Acquisitions that had to wait in the queue.
 * @property {number} queueWaitMsTotal - Summed queue-wait time (ms); avg =
 *   queueWaitMsTotal / queuedCount.
 * @property {number} inFlight - Slots currently held (mirrors live `active`).
 * @property {number} queueDepthHWM - High-water mark of queue depth.
 */

/**
 * The live counter object exposed as `window.__perfStats`. Methods are
 * non-enumerable-by-omission for JSON (functions serialize to undefined and
 * are dropped), so `JSON.stringify(perfStats)` yields only the data fields.
 */
export const perfStats = {
	/** @type {boolean} */
	enabled: PERF_STATS_ENABLED,

	/** @type {{ hosts: Record<string, LimiterHostStats> }} */
	limiter: { hosts: {} },

	cache: {
		hits: 0,
		misses: 0,
		bytesFromCache: 0,
		bytesFromNetwork: 0,
		deserializeMsTotal: 0,
		deserializeCount: 0,
	},

	render: { requestRenderCount: 0 },

	/**
	 * Get-or-create the counter bucket for a limiter host key.
	 * @param {string} hostKey
	 * @returns {LimiterHostStats}
	 */
	_host(hostKey) {
		let bucket = this.limiter.hosts[hostKey]
		if (!bucket) {
			bucket = {
				acquired: 0,
				queuedCount: 0,
				queueWaitMsTotal: 0,
				inFlight: 0,
				queueDepthHWM: 0,
			}
			this.limiter.hosts[hostKey] = bucket
		}
		return bucket
	},

	/**
	 * Record a slot acquisition. `waitMs > 0` means it was parked in the queue.
	 * @param {string} hostKey
	 * @param {number} waitMs - Time spent queued before the slot was granted.
	 */
	recordLimiterAcquire(hostKey, waitMs) {
		const bucket = this._host(hostKey)
		bucket.acquired += 1
		bucket.inFlight += 1
		if (waitMs > 0) {
			bucket.queuedCount += 1
			bucket.queueWaitMsTotal += waitMs
		}
	},

	/**
	 * Record that a request was parked in the queue at the given depth, updating
	 * the high-water mark.
	 * @param {string} hostKey
	 * @param {number} depth - Queue length immediately after enqueue.
	 */
	recordLimiterEnqueue(hostKey, depth) {
		const bucket = this._host(hostKey)
		if (depth > bucket.queueDepthHWM) bucket.queueDepthHWM = depth
	},

	/**
	 * Record a slot release (decrements in-flight).
	 * @param {string} hostKey
	 */
	recordLimiterRelease(hostKey) {
		const bucket = this._host(hostKey)
		bucket.inFlight = Math.max(0, bucket.inFlight - 1)
	},

	/**
	 * Record an IndexedDB cache hit and the bytes it served.
	 * @param {number} bytes - Stored entry size (0 if unknown).
	 */
	recordCacheHit(bytes) {
		this.cache.hits += 1
		this.cache.bytesFromCache += bytes || 0
	},

	/** Record an IndexedDB cache miss (absent or expired). */
	recordCacheMiss() {
		this.cache.misses += 1
	},

	/**
	 * Record bytes fetched from the network (Content-Length; 0 when absent,
	 * e.g. chunked or gzip-without-length responses).
	 * @param {number} bytes
	 */
	recordNetworkBytes(bytes) {
		this.cache.bytesFromNetwork += bytes || 0
	},

	/**
	 * Record time spent deserializing a network response body (JSON/text parse).
	 * @param {number} ms
	 */
	recordDeserialize(ms) {
		this.cache.deserializeMsTotal += ms
		this.cache.deserializeCount += 1
	},

	/** Record one `viewer.scene.requestRender()` call. */
	recordRequestRender() {
		this.render.requestRenderCount += 1
	},

	/**
	 * Zero every counter in place (preserves the exposed object identity so a
	 * captured `window.__perfStats` reference keeps pointing at live data).
	 */
	reset() {
		for (const key of Object.keys(this.limiter.hosts)) {
			delete this.limiter.hosts[key]
		}
		this.cache.hits = 0
		this.cache.misses = 0
		this.cache.bytesFromCache = 0
		this.cache.bytesFromNetwork = 0
		this.cache.deserializeMsTotal = 0
		this.cache.deserializeCount = 0
		this.render.requestRenderCount = 0
	},
}

// Expose on window for the measurement harness — dev/E2E only.
if (PERF_STATS_ENABLED && typeof window !== 'undefined') {
	// This custom global isn't part of the standard Window type; widen to attach.
	const debugWindow = /** @type {Window & { __perfStats?: typeof perfStats }} */ (window)
	debugWindow.__perfStats = perfStats
}

export default perfStats
