/**
 * unifiedLoader.loadStandard content-type guard (#994).
 *
 * A 2xx `text/html` body (the SPA catch-all answering an unmatched path, or an
 * upstream error page) used to reach `response.json()` and surface as a bare
 * `SyntaxError: Unexpected token '<'` with no URL. The guard names the URL and
 * the content type instead (.claude/rules/code-quality.md, "Guard
 * `response.json()` Against SPA Catch-All").
 *
 * Tags: @unit
 */

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetForTests as resetBreaker } from '../../../src/services/hostCircuitBreaker.js'
import { __resetForTests as resetLimiter } from '../../../src/services/hostConcurrencyLimiter.js'
import unifiedLoader from '../../../src/services/unifiedLoader.js'
import { useLoadingStore } from '../../../src/stores/loadingStore.js'

const URL = '/pygeoapi/collections/othernature/items?f=json&limit=1'
const FEATURES = { type: 'FeatureCollection', features: [] }

/** A 200 response whose body parses as JSON only if it really is JSON. */
function respond(contentType, body) {
	return {
		ok: true,
		status: 200,
		headers: {
			get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null),
		},
		json: async () => JSON.parse(body),
		text: async () => body,
	}
}

const HTML = '<!doctype html><html><body>index.html</body></html>'

describe('unifiedLoader.loadStandard — content-type guard (#994)', () => {
	let loadingStore

	beforeEach(() => {
		setActivePinia(createPinia())
		loadingStore = useLoadingStore()
		unifiedLoader._loadingStore = null
		unifiedLoader._loadingStoreFallback = false
		resetBreaker()
		resetLimiter()
		global.fetch = vi.fn()
	})

	afterEach(() => {
		resetBreaker()
		resetLimiter()
		vi.restoreAllMocks()
	})

	const load = (layerId, type) =>
		unifiedLoader.loadLayer({ layerId, url: URL, type, options: { cache: false, retries: 0 } })

	for (const type of ['geojson', 'json']) {
		it(`rejects a 200 text/html body for type '${type}' with a named error`, async () => {
			global.fetch.mockResolvedValue(respond('text/html; charset=utf-8', HTML))
			const error = await load(`html-${type}`, type).catch((e) => e)

			expect(error.name).toBe('UnexpectedContentTypeError')
			expect(error.message).toContain(URL)
			expect(error.message).toContain('text/html; charset=utf-8')
			expect(loadingStore.loadingErrors[`html-${type}`]).toBe(error.message)
		})
	}

	it('rejects a 200 text/html body on the default branch too', async () => {
		global.fetch.mockResolvedValue(respond('text/html', HTML))
		const error = await unifiedLoader
			.loadStandard('html-default', URL, 'unknown-type', 0, undefined)
			.catch((e) => e)

		expect(error.name).toBe('UnexpectedContentTypeError')
	})

	for (const contentType of [
		'application/json',
		'application/json;charset=UTF-8',
		'application/geo+json',
	]) {
		it(`parses a ${contentType} body`, async () => {
			global.fetch.mockResolvedValue(respond(contentType, JSON.stringify(FEATURES)))
			await expect(load(`ok-${contentType}`, 'geojson')).resolves.toEqual(FEATURES)
		})
	}

	it('parses a body with no content-type header, as before the guard', async () => {
		// The catch-all always sends text/html; a missing header is some other
		// upstream, and refusing it would drop data that parses fine.
		global.fetch.mockResolvedValue(respond(null, JSON.stringify(FEATURES)))
		await expect(load('no-header', 'geojson')).resolves.toEqual(FEATURES)
	})

	it('leaves text loads alone', async () => {
		global.fetch.mockResolvedValue(respond('text/html', HTML))
		await expect(load('text', 'text')).resolves.toBe(HTML)
	})
})
