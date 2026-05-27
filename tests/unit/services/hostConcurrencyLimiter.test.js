/**
 * Unit tests for hostConcurrencyLimiter.
 *
 * Tags: @unit
 */

import { afterEach, describe, expect, it } from 'vitest'
import {
	__resetForTests,
	acquireHostSlot,
	DEFAULT_LIMIT,
	extractHostKey,
	inspectLimiter,
	setHostLimit,
} from '../../../src/services/hostConcurrencyLimiter.js'

describe('extractHostKey', () => {
	it('returns the hostname for absolute URLs', () => {
		expect(extractHostKey('https://kartta.hsy.fi/geoserver/wfs')).toBe('kartta.hsy.fi')
		expect(extractHostKey('http://localhost:5173/foo')).toBe('localhost')
	})

	it('returns the first path segment for relative URLs (matches Vite proxy buckets)', () => {
		expect(extractHostKey('/pygeoapi/collections/foo')).toBe('pygeoapi')
		expect(extractHostKey('/hsy-action?route=x')).toBe('hsy-action?route=x')
		expect(extractHostKey('/wms/proxy/tile')).toBe('wms')
	})

	it('handles edge cases without crashing', () => {
		expect(extractHostKey('/')).toBe('__root__')
		expect(extractHostKey('')).toBe('__root__')
	})
})

describe('acquireHostSlot', () => {
	afterEach(() => __resetForTests())

	it('lets calls up to the limit run immediately', async () => {
		setHostLimit('host-a', 2)
		const r1 = await acquireHostSlot('https://host-a/x')
		const r2 = await acquireHostSlot('https://host-a/y')
		expect(inspectLimiter()['host-a']).toEqual({ active: 2, queued: 0, limit: 2 })
		r1()
		r2()
	})

	it('queues calls past the limit until a slot is released', async () => {
		setHostLimit('host-b', 1)
		const r1 = await acquireHostSlot('https://host-b/x')
		const pending = acquireHostSlot('https://host-b/y')

		await Promise.resolve()
		expect(inspectLimiter()['host-b']).toEqual({ active: 1, queued: 1, limit: 1 })

		r1()
		const r2 = await pending
		expect(inspectLimiter()['host-b']).toEqual({ active: 1, queued: 0, limit: 1 })
		r2()
	})

	it('respects DEFAULT_LIMIT for unconfigured hosts', async () => {
		const releases = []
		for (let i = 0; i < DEFAULT_LIMIT; i++) {
			releases.push(await acquireHostSlot('https://default-host/x'))
		}
		await Promise.resolve()
		expect(inspectLimiter()['default-host'].active).toBe(DEFAULT_LIMIT)
		releases.forEach((r) => r())
	})

	it('keys absolute and relative URLs independently', async () => {
		setHostLimit('kartta.hsy.fi', 1)
		setHostLimit('pygeoapi', 1)

		const a = await acquireHostSlot('https://kartta.hsy.fi/foo')
		const b = await acquireHostSlot('/pygeoapi/bar')

		// Both ran in parallel — different host keys.
		const state = inspectLimiter()
		expect(state['kartta.hsy.fi'].active).toBe(1)
		expect(state.pygeoapi.active).toBe(1)
		a()
		b()
	})

	it('aborts a queued call when the signal fires', async () => {
		setHostLimit('host-c', 1)
		const r1 = await acquireHostSlot('https://host-c/x')

		const controller = new AbortController()
		const pending = acquireHostSlot('https://host-c/y', controller.signal)
		await Promise.resolve()
		expect(inspectLimiter()['host-c'].queued).toBe(1)

		controller.abort(new Error('user cancelled'))
		await expect(pending).rejects.toThrow('user cancelled')
		expect(inspectLimiter()['host-c'].queued).toBe(0)
		r1()
	})

	it('release() is idempotent', async () => {
		setHostLimit('host-d', 1)
		const release = await acquireHostSlot('https://host-d/x')
		release()
		release() // second call is a no-op
		expect(inspectLimiter()['host-d'].active).toBe(0)
	})
})

describe('setHostLimit validation', () => {
	afterEach(() => __resetForTests())

	it('rejects non-positive or non-finite limits', () => {
		expect(() => setHostLimit('host-e', 0)).toThrow()
		expect(() => setHostLimit('host-e', -1)).toThrow()
		expect(() => setHostLimit('host-e', Number.NaN)).toThrow()
		expect(() => setHostLimit('host-e', Number.POSITIVE_INFINITY)).toThrow()
	})

	it('floors fractional limits', async () => {
		setHostLimit('host-f', 2.7)
		const releases = []
		for (let i = 0; i < 2; i++) {
			releases.push(await acquireHostSlot('https://host-f/x'))
		}
		await Promise.resolve()
		expect(inspectLimiter()['host-f'].limit).toBe(2)
		releases.forEach((r) => r())
	})
})
