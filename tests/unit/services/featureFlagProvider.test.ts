/**
 * Unit tests for the GOFF endpoint guard in `featureFlagProvider.ts`.
 *
 * Issue #738: `TypeError: Failed to construct 'URL': Invalid URL` was firing
 * 172 times across 22 Sentry fingerprints from the GoFeatureFlag provider's
 * retry loop. The fix introduces `isValidGoffEndpoint()` to short-circuit
 * provider initialization when the endpoint is missing/empty/relative.
 *
 * These tests pin the validator's contract so future refactors can't
 * silently re-introduce the bad-input path that the GOFF library throws on.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Stub Sentry — the provider module imports it at the top level and the SDK
// triggers globalThis side effects we don't want in a unit-test environment.
vi.mock('@sentry/vue', () => ({
	addBreadcrumb: vi.fn(),
}))

// Stub the user store — we don't exercise it in this file, but the module
// imports its type and would otherwise transitively load Pinia.
vi.mock('@/stores/userStore', () => ({
	useUserStore: () => ({
		targetingKey: 'test',
		email: null,
		domain: null,
	}),
}))

// Stub the feature-flag store — the InMemoryProvider fallback writes to it.
vi.mock('@/stores/featureFlagStore', () => ({
	useFeatureFlagStore: () => ({
		setProviderSource: vi.fn(),
	}),
}))

// Stub the GOFF web provider — we don't want its real `initialize()` to fire
// network requests or websocket connections during a unit test. The fix
// short-circuits *before* this constructor runs, so we never expect it to be
// invoked when the endpoint is invalid.
const goffProviderCtor = vi.fn()
vi.mock('@openfeature/go-feature-flag-web-provider', () => ({
	GoFeatureFlagWebProvider: vi.fn().mockImplementation((opts) => {
		goffProviderCtor(opts)
		return { metadata: { name: 'GoFeatureFlagWebProvider' } }
	}),
}))

// Stub the InMemoryProvider so we can confirm the fallback path is taken.
const inMemoryProviderCtor = vi.fn()
vi.mock('@openfeature/web-sdk', async () => {
	const actual =
		await vi.importActual<typeof import('@openfeature/web-sdk')>('@openfeature/web-sdk')
	return {
		...actual,
		InMemoryProvider: vi.fn().mockImplementation((flags) => {
			inMemoryProviderCtor(flags)
			return { metadata: { name: 'in-memory' } }
		}),
		OpenFeature: {
			setContext: vi.fn().mockResolvedValue(undefined),
			setProviderAndWait: vi.fn().mockResolvedValue(undefined),
			getClient: vi.fn(),
		},
	}
})

import { isValidGoffEndpoint } from '@/services/featureFlagProvider'

describe('featureFlagProvider — isValidGoffEndpoint (#738)', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		goffProviderCtor.mockClear()
		inMemoryProviderCtor.mockClear()
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	describe('rejects values the GOFF library cannot consume', () => {
		it('returns false for undefined', () => {
			expect(isValidGoffEndpoint(undefined)).toBe(false)
		})

		it('returns false for null', () => {
			expect(isValidGoffEndpoint(null)).toBe(false)
		})

		it('returns false for the empty string', () => {
			expect(isValidGoffEndpoint('')).toBe(false)
		})

		it('returns false for a relative path (the protocol-relative case behind #738)', () => {
			// `/feature-flags` is the value that leaked into the production
			// bundle when `window.location.origin` was unavailable. Without a
			// base, `new URL('/feature-flags')` throws — which is what was
			// surfacing in Sentry.
			expect(isValidGoffEndpoint('/feature-flags')).toBe(false)
		})

		it('returns false for a non-URL string', () => {
			expect(isValidGoffEndpoint('not a url')).toBe(false)
		})

		it('returns false for a number', () => {
			expect(isValidGoffEndpoint(8080 as unknown)).toBe(false)
		})

		it('returns false for an object', () => {
			expect(isValidGoffEndpoint({ href: 'http://x' } as unknown)).toBe(false)
		})
	})

	describe('accepts absolute URLs the GOFF library can parse', () => {
		it('returns true for an http URL', () => {
			expect(isValidGoffEndpoint('http://localhost:4173/feature-flags')).toBe(true)
		})

		it('returns true for an https URL with a path', () => {
			expect(isValidGoffEndpoint('https://goff.example.com/feature-flags')).toBe(true)
		})

		it('returns true for a wss URL (the websocket scheme GOFF rewrites to)', () => {
			expect(isValidGoffEndpoint('wss://goff.example.com/ws')).toBe(true)
		})

		it('returns true even when the URL lacks a trailing slash', () => {
			expect(isValidGoffEndpoint('https://goff.example.com')).toBe(true)
		})
	})

	describe('parity with `new URL(value)` (the GOFF library check)', () => {
		// The library calls `new URL(this._endpoint)` directly in three hot
		// paths. The guard must agree with that check for every input we
		// exercise here — if the library would throw, the guard must return
		// false, and vice versa.
		const cases: Array<{ value: unknown; expected: boolean }> = [
			{ value: undefined, expected: false },
			{ value: '', expected: false },
			{ value: '/feature-flags', expected: false },
			{ value: 'http://localhost:4173/', expected: true },
			{ value: 'https://goff.example.com/feature-flags', expected: true },
			{ value: 'wss://goff.example.com/ws/v1/flag/change', expected: true },
		]

		for (const { value, expected } of cases) {
			it(`agrees with new URL() for ${JSON.stringify(value)}`, () => {
				let urlCtorThrew = false
				try {
					// eslint-disable-next-line no-new
					new URL(value as string)
				} catch {
					urlCtorThrew = true
				}
				// Guard must return true iff the constructor would NOT throw.
				expect(isValidGoffEndpoint(value)).toBe(!urlCtorThrew)
				expect(isValidGoffEndpoint(value)).toBe(expected)
			})
		}
	})
})
