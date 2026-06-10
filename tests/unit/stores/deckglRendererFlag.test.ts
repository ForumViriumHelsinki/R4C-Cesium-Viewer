import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAG_METADATA } from '@/constants/flagMetadata'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'

// Mock the OpenFeature provider so the store falls back to fallbackDefault.
vi.mock('@/services/featureFlagProvider', () => ({
	getClient: () => ({
		getBooleanValue: (_flagId: string, defaultValue: boolean) => defaultValue,
	}),
}))

describe('r4c-deckgl-renderer flag wiring', () => {
	let store: ReturnType<typeof useFeatureFlagStore>

	beforeEach(() => {
		setActivePinia(createPinia())
		localStorage.clear()
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.spyOn(console, 'info').mockImplementation(() => {})
		store = useFeatureFlagStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('registers metadata with the canonical GOFF id and OFF default', () => {
		const meta = FLAG_METADATA.deckglRenderer
		expect(meta).toBeDefined()
		expect(meta.goffId).toBe('r4c-deckgl-renderer')
		expect(meta.fallbackDefault).toBe(false)
		expect(meta.experimental).toBe(true)
		expect(meta.category).toBe('graphics')
	})

	it('is OFF by default (no override, fallback path)', () => {
		expect(store.isEnabled('deckglRenderer')).toBe(false)
	})

	it('can be toggled ON via a local override (FeatureFlagsPanel path)', () => {
		store.setFlag('deckglRenderer', true)
		expect(store.isEnabled('deckglRenderer')).toBe(true)
		expect(store.hasOverride('deckglRenderer')).toBe(true)
	})

	it('returns to OFF when the override is reset', () => {
		store.setFlag('deckglRenderer', true)
		store.resetFlag('deckglRenderer')
		expect(store.isEnabled('deckglRenderer')).toBe(false)
	})

	it('persists the override to localStorage so a reload keeps the A/B choice', () => {
		store.setFlag('deckglRenderer', true)
		const stored = JSON.parse(localStorage.getItem('featureFlags') ?? '{}')
		expect(stored.deckglRenderer).toBe(true)
	})

	it('surfaces in the graphics category for the feature-flag panel', () => {
		const names = store.flagsByCategory('graphics').map((f) => f.name)
		expect(names).toContain('deckglRenderer')
	})
})
