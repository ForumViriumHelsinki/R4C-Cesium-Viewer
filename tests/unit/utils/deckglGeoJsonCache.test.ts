import { describe, expect, it, vi } from 'vitest'
import { createGeoJsonCache } from '@/utils/deckglGeoJsonCache'

const fc = { type: 'FeatureCollection', features: [] }
const jsonResponse = (body: unknown, contentType = 'application/geo+json') => ({
	ok: true,
	status: 200,
	headers: { get: () => contentType },
	json: async () => body,
})

describe('createGeoJsonCache', () => {
	it('fetches a URL once, even when requested again while in flight', async () => {
		const fetchImpl = vi.fn(async () => jsonResponse(fc))
		const onChange = vi.fn()
		const cache = createGeoJsonCache({ fetchImpl, onChange })
		cache.request('/a.json')
		cache.request('/a.json')
		expect(cache.get('/a.json')).toBeNull()
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
		cache.request('/a.json')
		expect(fetchImpl).toHaveBeenCalledTimes(1)
		expect(cache.get('/a.json')).toEqual(fc)
	})

	it('reports a failed fetch, keeps no data, and retries on the next request', async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({ ok: false, status: 502, headers: { get: () => '' } })
			.mockResolvedValueOnce(jsonResponse(fc))
		const onError = vi.fn()
		const onChange = vi.fn()
		const cache = createGeoJsonCache({ fetchImpl, onError, onChange })
		cache.request('/a.json')
		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
		expect(cache.get('/a.json')).toBeNull()
		cache.request('/a.json')
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
		expect(cache.get('/a.json')).toEqual(fc)
	})

	it('rejects an HTML body served by the SPA catch-all', async () => {
		const fetchImpl = vi.fn(async () => jsonResponse('<!doctype html>', 'text/html'))
		const onError = vi.fn()
		const cache = createGeoJsonCache({ fetchImpl, onError })
		cache.request('/a.json')
		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
		expect(cache.get('/a.json')).toBeNull()
	})

	it('drops results that arrive after dispose', async () => {
		let resolve: (v: unknown) => void = () => {}
		const fetchImpl = vi.fn(() => new Promise((r) => (resolve = r)))
		const onChange = vi.fn()
		const cache = createGeoJsonCache({ fetchImpl, onChange })
		cache.request('/a.json')
		cache.dispose()
		resolve(jsonResponse(fc))
		await new Promise((r) => setTimeout(r, 0))
		expect(onChange).not.toHaveBeenCalled()
		expect(cache.get('/a.json')).toBeNull()
	})
})
