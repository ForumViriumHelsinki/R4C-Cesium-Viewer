/**
 * @module utils/deckglGeoJsonCache
 *
 * Fetch-once cache of GeoJSON files for the deck.gl map renderer (ADR-012).
 * Layer definitions name the URL they need (`dataUrl`); the map host requests
 * every named URL and passes the loaded data back to the layers as state.
 * Requests for a URL already loaded or in flight are no-ops; a failed fetch is
 * reported and forgotten, so the next request retries it.
 */

/**
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {() => void} [options.onChange] - called after a URL has loaded
 * @param {(url: string, error: unknown) => void} [options.onError]
 */
export function createGeoJsonCache({
	fetchImpl = (input, init) => fetch(input, init),
	onChange = () => {},
	onError = () => {},
} = {}) {
	/** @type {Map<string, unknown>} */
	const loaded = new Map()
	/** @type {Set<string>} */
	const inFlight = new Set()
	let disposed = false

	/** @param {string} url */
	async function load(url) {
		const response = await fetchImpl(url)
		if (!response.ok) throw new Error(`GeoJSON fetch failed: HTTP ${response.status} (${url})`)
		// The SPA catch-all answers unknown paths with 200 text/html (code-quality.md).
		const contentType = response.headers?.get?.('content-type') ?? ''
		if (!contentType.toLowerCase().includes('json')) {
			throw new Error(`GeoJSON fetch returned ${contentType || 'no content type'} (${url})`)
		}
		return response.json()
	}

	return {
		/** @param {string} url */
		request(url) {
			if (disposed || loaded.has(url) || inFlight.has(url)) return
			inFlight.add(url)
			load(url)
				.then((data) => {
					if (disposed) return
					loaded.set(url, data)
					onChange()
				})
				.catch((error) => {
					if (!disposed) onError(url, error)
				})
				.finally(() => inFlight.delete(url))
		},

		/** @param {string} url */
		get(url) {
			return loaded.get(url) ?? null
		},

		dispose() {
			disposed = true
			loaded.clear()
		},
	}
}
