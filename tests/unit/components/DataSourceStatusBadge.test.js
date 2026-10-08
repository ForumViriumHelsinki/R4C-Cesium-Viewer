/**
 * DataSourceStatusBadge probes four upstreams for reachability (#997).
 *
 * Pins the cheap-probe contract: one small request per source per check, no
 * response body read or cached, and no checks while the tab is hidden.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/cacheService', () => ({
	default: {
		getData: vi.fn(),
		setData: vi.fn(),
		clearAll: vi.fn().mockResolvedValue(undefined),
	},
}))

import DataSourceStatusBadge from '@/components/DataSourceStatusBadge.vue'
import cacheService from '@/services/cacheService'

const INTERVAL = 30000
const SOURCE_COUNT = 4

/** A Response stand-in whose body readers fail the test if called. */
const makeResponse = ({ ok = true, status = 200, contentType = 'application/json' } = {}) => {
	const response = {
		ok,
		status,
		headers: new Headers(contentType ? { 'content-type': contentType } : {}),
		body: { cancel: vi.fn().mockResolvedValue(undefined) },
		json: vi.fn(),
		text: vi.fn(),
		blob: vi.fn(),
		arrayBuffer: vi.fn(),
	}
	return response
}

const setHidden = (hidden) => {
	Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
}

const changeVisibility = (hidden) => {
	setHidden(hidden)
	document.dispatchEvent(new Event('visibilitychange'))
}

const mountBadge = () =>
	mount(DataSourceStatusBadge, {
		props: { refreshInterval: INTERVAL },
		global: {
			stubs: {
				VMenu: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
				VBtn: { template: '<button><slot /></button>' },
				VIcon: true,
				VCard: { template: '<div><slot /></div>' },
				VCardTitle: { template: '<div><slot /></div>' },
				VCardText: { template: '<div><slot /></div>' },
				VCardActions: { template: '<div><slot /></div>' },
				VChip: true,
				VDivider: true,
				VSpacer: true,
			},
		},
	})

describe('DataSourceStatusBadge', () => {
	let wrapper
	let responses

	beforeEach(() => {
		vi.useFakeTimers()
		setHidden(false)
		responses = []
		global.fetch = vi.fn(async () => {
			const response = makeResponse()
			responses.push(response)
			return response
		})
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = undefined
		vi.useRealTimers()
		setHidden(false)
		vi.clearAllMocks()
	})

	it('issues exactly one small request per source on mount', async () => {
		wrapper = mountBadge()
		await flushPromises()

		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT)
		const calls = fetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)
		expect(calls).toEqual([
			'GET /pygeoapi/collections/heatexposure_optimized/items?f=json&limit=1',
			'HEAD /hsy-action?action_route=GetHierarchicalMapLayerGroups',
			'GET /paavo?count=1',
			'GET /digitransit/geocoding/v1/search?text=Helsinki&size=1',
		])
		expect(wrapper.text()).toContain(`${SOURCE_COUNT}/${SOURCE_COUNT}`)
	})

	it('never reads a response body and cancels the stream instead', async () => {
		wrapper = mountBadge()
		await flushPromises()

		expect(responses).toHaveLength(SOURCE_COUNT)
		for (const response of responses) {
			expect(response.json).not.toHaveBeenCalled()
			expect(response.text).not.toHaveBeenCalled()
			expect(response.blob).not.toHaveBeenCalled()
			expect(response.arrayBuffer).not.toHaveBeenCalled()
			expect(response.body.cancel).toHaveBeenCalledTimes(1)
		}
	})

	it('does not read or write health entries in the cache', async () => {
		wrapper = mountBadge()
		await flushPromises()
		await vi.advanceTimersByTimeAsync(INTERVAL)

		expect(cacheService.getData).not.toHaveBeenCalled()
		expect(cacheService.setData).not.toHaveBeenCalled()
	})

	it('marks a 2xx non-JSON answer (the SPA catch-all) as an error', async () => {
		fetch.mockImplementation(async () => makeResponse({ contentType: 'text/html' }))
		wrapper = mountBadge()
		await flushPromises()

		expect(wrapper.text()).toContain(`0/${SOURCE_COUNT}`)
		expect(wrapper.text()).toContain('Unexpected content type (text/html)')
	})

	it('marks a non-2xx answer as an error', async () => {
		fetch.mockImplementation(async () => makeResponse({ ok: false, status: 401 }))
		wrapper = mountBadge()
		await flushPromises()

		expect(wrapper.text()).toContain('HTTP 401')
	})

	it('re-checks once per interval while visible', async () => {
		wrapper = mountBadge()
		await flushPromises()
		fetch.mockClear()

		await vi.advanceTimersByTimeAsync(INTERVAL)
		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT)
	})

	it('runs no checks while the tab is hidden', async () => {
		wrapper = mountBadge()
		await flushPromises()
		fetch.mockClear()

		changeVisibility(true)
		await vi.advanceTimersByTimeAsync(INTERVAL * 10)

		expect(fetch).not.toHaveBeenCalled()
	})

	it('runs one check when the tab becomes visible again, then resumes the interval', async () => {
		wrapper = mountBadge()
		await flushPromises()
		changeVisibility(true)
		await vi.advanceTimersByTimeAsync(INTERVAL * 3)
		fetch.mockClear()

		changeVisibility(false)
		await flushPromises()
		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT)

		await vi.advanceTimersByTimeAsync(INTERVAL - 1)
		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT)
		await vi.advanceTimersByTimeAsync(1)
		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT * 2)
	})

	it('does not check on mount while hidden, and checks once on becoming visible', async () => {
		setHidden(true)
		wrapper = mountBadge()
		await flushPromises()
		await vi.advanceTimersByTimeAsync(INTERVAL * 3)
		expect(fetch).not.toHaveBeenCalled()

		changeVisibility(false)
		await flushPromises()
		expect(fetch).toHaveBeenCalledTimes(SOURCE_COUNT)
	})

	it('removes its visibility listener and timer on unmount', async () => {
		const removeSpy = vi.spyOn(document, 'removeEventListener')
		wrapper = mountBadge()
		await flushPromises()
		wrapper.unmount()
		wrapper = undefined
		fetch.mockClear()

		expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
		changeVisibility(true)
		changeVisibility(false)
		await vi.advanceTimersByTimeAsync(INTERVAL * 3)
		expect(fetch).not.toHaveBeenCalled()
		removeSpy.mockRestore()
	})

	it('starts no timer when unmounted during the first check', async () => {
		let release
		fetch.mockImplementation(
			() =>
				new Promise((resolve) => {
					release = () => resolve(makeResponse())
				})
		)
		wrapper = mountBadge()
		wrapper.unmount()
		wrapper = undefined
		release()
		await flushPromises()
		fetch.mockClear()

		await vi.advanceTimersByTimeAsync(INTERVAL * 3)
		expect(fetch).not.toHaveBeenCalled()
	})
})
