/**
 * Web Worker for GeoJSON parsing
 *
 * Moves the expensive JSON parsing operation off the main thread.
 * For large GeoJSON files (e.g., 8.9 MB r4c_stats_grid_index.json),
 * this prevents UI blocking during the parse phase.
 *
 * Usage:
 *   const worker = new Worker(new URL('./geojsonParser.worker.js', import.meta.url))
 *   worker.postMessage({ url: '/assets/data/grid.json' })
 *   worker.onmessage = (e) => { const json = e.data }
 *
 * @module workers/geojsonParser
 */

self.onmessage = async (event) => {
	const { url } = event.data

	try {
		const response = await fetch(url)

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const json = await response.json()
		self.postMessage({ success: true, data: json })
	} catch (error) {
		self.postMessage({ success: false, error: error.message })
	}
}
