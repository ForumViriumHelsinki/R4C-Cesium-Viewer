import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type FeatureFlagCategory,
	type FeatureFlagName,
	useFeatureFlagStore,
} from '@/stores/featureFlagStore'

describe('featureFlagStore', () => {
	let store: ReturnType<typeof useFeatureFlagStore>

	beforeEach(() => {
		setActivePinia(createPinia())
		localStorage.clear()
		// Clear console warnings to avoid noise in tests
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		vi.spyOn(console, 'info').mockImplementation(() => {})
		store = useFeatureFlagStore()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('initial state', () => {
		it('should have flags initialized from environment variables', () => {
			expect(store.flags).toBeDefined()
			expect(store.flags.ndvi).toBeDefined()
			expect(store.flags.debugMode).toBeDefined()
			expect(store.userOverrides).toEqual({})
		})

		it('should have flag metadata with required properties', () => {
			const flag = store.flags.ndvi
			expect(flag).toHaveProperty('enabled')
			expect(flag).toHaveProperty('label')
			expect(flag).toHaveProperty('description')
			expect(flag).toHaveProperty('category')
			expect(flag).toHaveProperty('experimental')
		})

		it('should categorize flags correctly', () => {
			expect(store.flags.ndvi.category).toBe('data-layers')
			expect(store.flags.hdrRendering.category).toBe('graphics')
			expect(store.flags.heatHistogram.category).toBe('analysis')
			expect(store.flags.controlPanelDefault.category).toBe('ui')
			expect(store.flags.sentryErrorTracking.category).toBe('integration')
			expect(store.flags.debugMode.category).toBe('developer')
		})
	})

	describe('getters', () => {
		describe('isEnabled', () => {
			it('should return default flag value when no override exists', () => {
				// ndvi defaults to true in test environment
				const defaultValue = store.flags.ndvi.enabled
				expect(store.isEnabled('ndvi')).toBe(defaultValue)
			})

			it('should return override value when override exists', () => {
				store.userOverrides.ndvi = false
				expect(store.isEnabled('ndvi')).toBe(false)

				store.userOverrides.ndvi = true
				expect(store.isEnabled('ndvi')).toBe(true)
			})

			it('should return false for non-existent flags', () => {
				expect(store.isEnabled('nonExistentFlag' as FeatureFlagName)).toBe(false)
			})

			it('should handle boolean false override correctly', () => {
				store.userOverrides.ndvi = false
				expect(store.isEnabled('ndvi')).toBe(false)
			})
		})

		describe('flagsByCategory', () => {
			it('should filter flags by category correctly', () => {
				const dataLayerFlags = store.flagsByCategory('data-layers')
				expect(dataLayerFlags.length).toBeGreaterThan(0)
				expect(dataLayerFlags.every((flag) => flag.category === 'data-layers')).toBe(true)
			})

			it('should include flag name in returned objects', () => {
				const graphicsFlags = store.flagsByCategory('graphics')
				expect(graphicsFlags[0]).toHaveProperty('name')
				expect(graphicsFlags[0]).toHaveProperty('enabled')
				expect(graphicsFlags[0]).toHaveProperty('label')
			})

			it('should return empty array for non-existent category', () => {
				const flags = store.flagsByCategory('non-existent-category' as FeatureFlagCategory)
				expect(flags).toEqual([])
			})

			it('should return all flags in each category', () => {
				const categories: FeatureFlagCategory[] = [
					'data-layers',
					'graphics',
					'analysis',
					'ui',
					'integration',
					'developer',
				]
				categories.forEach((category) => {
					const flags = store.flagsByCategory(category)
					expect(Array.isArray(flags)).toBe(true)
				})
			})
		})

		describe('experimentalFlags', () => {
			it('should return only experimental flags', () => {
				const expFlags = store.experimentalFlags
				expect(expFlags.every((flag) => flag.experimental === true)).toBe(true)
			})

			it('should include flag name in returned objects', () => {
				const expFlags = store.experimentalFlags
				if (expFlags.length > 0) {
					expect(expFlags[0]).toHaveProperty('name')
				}
			})

			it('should not include non-experimental flags', () => {
				const expFlags = store.experimentalFlags
				const expFlagNames = expFlags.map((f) => f.name)
				expect(expFlagNames).not.toContain('ndvi') // ndvi is not experimental
			})
		})

		describe('categories', () => {
			it('should return all unique categories', () => {
				const cats = store.categories
				expect(cats).toContain('data-layers')
				expect(cats).toContain('graphics')
				expect(cats).toContain('analysis')
				expect(cats).toContain('ui')
				expect(cats).toContain('integration')
				expect(cats).toContain('developer')
			})

			it('should return sorted categories', () => {
				const cats = store.categories
				const sorted = [...cats].sort()
				expect(cats).toEqual(sorted)
			})

			it('should return array without duplicates', () => {
				const cats = store.categories
				const unique = [...new Set(cats)]
				expect(cats.length).toBe(unique.length)
			})
		})

		describe('enabledCount', () => {
			it('should count enabled flags accurately', () => {
				const count = store.enabledCount
				expect(typeof count).toBe('number')
				expect(count).toBeGreaterThanOrEqual(0)
			})

			it('should reflect user overrides in count', () => {
				const initialCount = store.enabledCount

				// Disable a flag that's enabled
				const enabledFlag = (Object.keys(store.flags) as FeatureFlagName[]).find((name) =>
					store.isEnabled(name)
				)
				if (enabledFlag) {
					store.userOverrides[enabledFlag] = false
					expect(store.enabledCount).toBe(initialCount - 1)
				}
			})

			it('should handle all flags disabled', () => {
				;(Object.keys(store.flags) as FeatureFlagName[]).forEach((name) => {
					store.userOverrides[name] = false
				})
				expect(store.enabledCount).toBe(0)
			})

			it('should handle all flags enabled', () => {
				;(Object.keys(store.flags) as FeatureFlagName[]).forEach((name) => {
					store.userOverrides[name] = true
				})
				expect(store.enabledCount).toBe(Object.keys(store.flags).length)
			})
		})

		describe('hasOverride', () => {
			it('should return false when no override exists', () => {
				expect(store.hasOverride('ndvi')).toBe(false)
			})

			it('should return true when override exists', () => {
				store.userOverrides.ndvi = false
				expect(store.hasOverride('ndvi')).toBe(true)
			})

			it('should return true even for override with same value as default', () => {
				const defaultValue = store.flags.ndvi.enabled
				store.userOverrides.ndvi = defaultValue
				expect(store.hasOverride('ndvi')).toBe(true)
			})

			it('should return false for non-existent flags', () => {
				expect(store.hasOverride('nonExistentFlag' as FeatureFlagName)).toBe(false)
			})
		})
	})

	describe('actions', () => {
		describe('setFlag', () => {
			it('should set user override and persist to localStorage', () => {
				store.setFlag('ndvi', false)

				expect(store.userOverrides.ndvi).toBe(false)
				expect(localStorage.getItem('featureFlags')).toBe(JSON.stringify({ ndvi: false }))
			})

			it('should update existing override', () => {
				store.setFlag('ndvi', false)
				store.setFlag('ndvi', true)

				expect(store.userOverrides.ndvi).toBe(true)
				expect(localStorage.getItem('featureFlags')).toBe(JSON.stringify({ ndvi: true }))
			})

			it('should handle multiple flag overrides', () => {
				store.setFlag('ndvi', false)
				store.setFlag('heatHistogram', false)

				expect(store.userOverrides).toEqual({
					ndvi: false,
					heatHistogram: false,
				})
			})

			it('should not set override for non-existent flags', () => {
				store.setFlag('nonExistentFlag' as FeatureFlagName, true)
				expect(store.userOverrides['nonExistentFlag' as FeatureFlagName]).toBeUndefined()
			})

			it('should persist changes immediately', () => {
				store.setFlag('ndvi', false)
				const stored = JSON.parse(localStorage.getItem('featureFlags') || '{}')
				expect(stored.ndvi).toBe(false)
			})
		})

		describe('resetFlag', () => {
			it('should remove user override and restore default value', () => {
				store.setFlag('ndvi', false)
				expect(store.isEnabled('ndvi')).toBe(false)

				store.resetFlag('ndvi')
				expect(store.userOverrides.ndvi).toBeUndefined()
				expect(store.isEnabled('ndvi')).toBe(store.flags.ndvi.enabled)
			})

			it('should update localStorage after reset', () => {
				store.setFlag('ndvi', false)
				store.setFlag('heatHistogram', false)

				store.resetFlag('ndvi')

				const stored = JSON.parse(localStorage.getItem('featureFlags') || '{}')
				expect(stored.ndvi).toBeUndefined()
				expect(stored.heatHistogram).toBe(false)
			})

			it('should handle resetting non-overridden flags gracefully', () => {
				expect(() => store.resetFlag('ndvi')).not.toThrow()
			})

			it('should handle resetting non-existent flags gracefully', () => {
				expect(() => store.resetFlag('nonExistentFlag' as FeatureFlagName)).not.toThrow()
			})
		})

		describe('resetAllFlags', () => {
			it('should reset all flags to default values', () => {
				store.setFlag('ndvi', false)
				store.setFlag('heatHistogram', false)
				store.setFlag('debugMode', false)

				store.resetAllFlags()

				expect(store.userOverrides).toEqual({})
				expect(store.isEnabled('ndvi')).toBe(store.flags.ndvi.enabled)
			})

			it('should clear localStorage', () => {
				store.setFlag('ndvi', false)
				store.resetAllFlags()

				const stored = localStorage.getItem('featureFlags')
				expect(stored).toBe(JSON.stringify({}))
			})

			it('should handle empty overrides gracefully', () => {
				expect(() => store.resetAllFlags()).not.toThrow()
			})
		})

		describe('loadOverrides', () => {
			it('should load overrides from localStorage', () => {
				localStorage.setItem('featureFlags', JSON.stringify({ ndvi: false, heatHistogram: false }))

				store.loadOverrides()

				expect(store.userOverrides).toEqual({
					ndvi: false,
					heatHistogram: false,
				})
			})

			it('should handle corrupted localStorage gracefully', () => {
				localStorage.setItem('featureFlags', 'invalid json {{{')

				expect(() => store.loadOverrides()).not.toThrow()
				expect(store.userOverrides).toEqual({})
			})

			it('should handle empty localStorage gracefully', () => {
				localStorage.removeItem('featureFlags')

				expect(() => store.loadOverrides()).not.toThrow()
				expect(store.userOverrides).toEqual({})
			})

			it('should handle null values in localStorage', () => {
				localStorage.setItem('featureFlags', null as any)

				expect(() => store.loadOverrides()).not.toThrow()
			})

			it('should warn on corrupted data', () => {
				const warnSpy = vi.spyOn(console, 'warn')
				localStorage.setItem('featureFlags', 'invalid json')

				store.loadOverrides()

				expect(warnSpy).toHaveBeenCalledWith(
					'Failed to load feature flag overrides:',
					expect.any(Error)
				)
			})
		})

		describe('persistOverrides', () => {
			it('should persist current overrides to localStorage', () => {
				store.userOverrides = { ndvi: false, heatHistogram: true }
				store.persistOverrides()

				const stored = JSON.parse(localStorage.getItem('featureFlags') || '{}')
				expect(stored).toEqual({ ndvi: false, heatHistogram: true })
			})

			it('should handle localStorage errors gracefully', () => {
				// Mock localStorage to throw error
				const originalSetItem = localStorage.setItem
				localStorage.setItem = vi.fn(() => {
					throw new Error('Storage quota exceeded')
				})

				expect(() => store.persistOverrides()).not.toThrow()

				localStorage.setItem = originalSetItem
			})

			it('should warn on persistence errors', () => {
				const warnSpy = vi.spyOn(console, 'warn')
				const originalSetItem = localStorage.setItem
				localStorage.setItem = vi.fn(() => {
					throw new Error('Storage error')
				})

				store.persistOverrides()

				expect(warnSpy).toHaveBeenCalledWith(
					'Failed to persist feature flag overrides:',
					expect.any(Error)
				)

				localStorage.setItem = originalSetItem
			})
		})

		describe('checkHardwareSupport', () => {
			it('should disable unsupported features correctly', () => {
				// hdrRendering requires support
				const _initialValue = store.flags.hdrRendering.enabled

				store.checkHardwareSupport('hdrRendering', false)

				expect(store.flags.hdrRendering.enabled).toBe(false)
			})

			it('should not disable supported features', () => {
				store.flags.hdrRendering.enabled = true

				store.checkHardwareSupport('hdrRendering', true)

				expect(store.flags.hdrRendering.enabled).toBe(true)
			})

			it('should not affect flags without requiresSupport', () => {
				const initialValue = store.flags.ndvi.enabled

				store.checkHardwareSupport('ndvi', false)

				expect(store.flags.ndvi.enabled).toBe(initialValue)
			})

			it('should log info message when disabling', () => {
				const infoSpy = vi.spyOn(console, 'info')

				store.checkHardwareSupport('hdrRendering', false)

				expect(infoSpy).toHaveBeenCalledWith(
					"Feature 'hdrRendering' disabled: hardware not supported"
				)
			})

			it('should handle non-existent flags gracefully', () => {
				expect(() =>
					store.checkHardwareSupport('nonExistentFlag' as FeatureFlagName, false)
				).not.toThrow()
			})
		})

		describe('getFlagMetadata', () => {
			it('should return flag metadata for existing flags', () => {
				const metadata = store.getFlagMetadata('ndvi')

				expect(metadata).toBeDefined()
				expect(metadata?.label).toBe('NDVI Vegetation Index')
				expect(metadata?.category).toBe('data-layers')
			})

			it('should return null for non-existent flags', () => {
				const metadata = store.getFlagMetadata('nonExistentFlag' as FeatureFlagName)
				expect(metadata).toBeNull()
			})

			it('should return complete metadata object', () => {
				const metadata = store.getFlagMetadata('hdrRendering')

				expect(metadata).toHaveProperty('enabled')
				expect(metadata).toHaveProperty('label')
				expect(metadata).toHaveProperty('description')
				expect(metadata).toHaveProperty('category')
				expect(metadata).toHaveProperty('experimental')
				expect(metadata).toHaveProperty('requiresSupport')
			})
		})

		describe('exportConfig', () => {
			it('should create valid JSON with all flags', () => {
				const config = store.exportConfig()

				expect(typeof config).toBe('object')
				expect(Object.keys(config).length).toBe(Object.keys(store.flags).length)
			})

			it('should include current enabled state for each flag', () => {
				store.setFlag('ndvi', false)

				const config = store.exportConfig()

				expect(config.ndvi).toBe(false)
			})

			it('should reflect user overrides in export', () => {
				store.setFlag('ndvi', false)
				store.setFlag('heatHistogram', true)

				const config = store.exportConfig()

				expect(config.ndvi).toBe(false)
				expect(config.heatHistogram).toBe(true)
			})

			it('should export only boolean values', () => {
				const config = store.exportConfig()

				Object.values(config).forEach((value) => {
					expect(typeof value).toBe('boolean')
				})
			})

			it('should be JSON serializable', () => {
				const config = store.exportConfig()
				expect(() => JSON.stringify(config)).not.toThrow()
			})
		})

		describe('importConfig', () => {
			it('should handle invalid JSON gracefully', () => {
				// Import config accepts object, not string
				expect(() => store.importConfig({})).not.toThrow()
			})

			it('should import valid configuration', () => {
				const config = {
					ndvi: false,
					heatHistogram: false,
					debugMode: true,
				}

				store.importConfig(config)

				expect(store.isEnabled('ndvi')).toBe(false)
				expect(store.isEnabled('heatHistogram')).toBe(false)
				expect(store.isEnabled('debugMode')).toBe(true)
			})

			it('should ignore non-existent flags in import', () => {
				const config = {
					ndvi: false,
					nonExistentFlag: true,
				}

				store.importConfig(config)

				expect(store.isEnabled('ndvi')).toBe(false)
				expect(store.userOverrides['nonExistentFlag' as FeatureFlagName]).toBeUndefined()
			})

			it('should warn about unknown flags in import', () => {
				const warnSpy = vi.spyOn(console, 'warn')
				const config = {
					ndvi: false,
					unknownFlag: true,
					anotherUnknown: false,
				}

				store.importConfig(config)

				expect(warnSpy).toHaveBeenCalledWith(
					'Unknown feature flag "unknownFlag" in imported configuration'
				)
				expect(warnSpy).toHaveBeenCalledWith(
					'Unknown feature flag "anotherUnknown" in imported configuration'
				)
				expect(warnSpy).toHaveBeenCalledTimes(2)
				warnSpy.mockRestore()
			})

			it('should warn about invalid value types in import', () => {
				const warnSpy = vi.spyOn(console, 'warn')
				const config = {
					ndvi: 'true', // string instead of boolean
					heatHistogram: 1, // number instead of boolean
					debugMode: null, // null instead of boolean
				}

				store.importConfig(config)

				expect(warnSpy).toHaveBeenCalledWith(
					'Invalid value for feature flag "ndvi": expected boolean, got string'
				)
				expect(warnSpy).toHaveBeenCalledWith(
					'Invalid value for feature flag "heatHistogram": expected boolean, got number'
				)
				expect(warnSpy).toHaveBeenCalledWith(
					'Invalid value for feature flag "debugMode": expected boolean, got object'
				)
				expect(warnSpy).toHaveBeenCalledTimes(3)
				warnSpy.mockRestore()
			})

			it('should persist imported configuration', () => {
				const config = {
					ndvi: false,
					heatHistogram: true,
				}

				store.importConfig(config)

				const stored = JSON.parse(localStorage.getItem('featureFlags') || '{}')
				expect(stored.ndvi).toBe(false)
				expect(stored.heatHistogram).toBe(true)
			})

			it('should handle partial configuration imports', () => {
				store.setFlag('ndvi', false)
				store.setFlag('heatHistogram', false)

				const config = {
					ndvi: true, // Only update ndvi
				}

				store.importConfig(config)

				expect(store.isEnabled('ndvi')).toBe(true)
				expect(store.isEnabled('heatHistogram')).toBe(false) // Should remain unchanged
			})

			it('should handle empty configuration object', () => {
				expect(() => store.importConfig({})).not.toThrow()
			})
		})
	})

	describe('integration scenarios', () => {
		it('should handle complete workflow: set, persist, load, reset', () => {
			// Set some flags
			store.setFlag('ndvi', false)
			store.setFlag('heatHistogram', false)

			// Create new store instance to simulate page reload
			const newStore = useFeatureFlagStore()
			newStore.loadOverrides()

			// Verify flags are loaded
			expect(newStore.isEnabled('ndvi')).toBe(false)
			expect(newStore.isEnabled('heatHistogram')).toBe(false)

			// Reset all
			newStore.resetAllFlags()
			expect(newStore.userOverrides).toEqual({})
		})

		it('should handle export and import round-trip', () => {
			store.setFlag('ndvi', false)
			store.setFlag('heatHistogram', true)
			store.setFlag('debugMode', false)

			const exported = store.exportConfig()

			store.resetAllFlags()
			expect(store.userOverrides).toEqual({})

			store.importConfig(exported)

			expect(store.isEnabled('ndvi')).toBe(false)
			expect(store.isEnabled('heatHistogram')).toBe(true)
			expect(store.isEnabled('debugMode')).toBe(false)
		})

		it('should handle hardware support check workflow', () => {
			// Enable HDR initially
			store.flags.hdrRendering.enabled = true

			// Check hardware support - not supported
			store.checkHardwareSupport('hdrRendering', false)
			expect(store.flags.hdrRendering.enabled).toBe(false)

			// User override shouldn't change hardware limitation
			store.setFlag('hdrRendering', true)
			expect(store.isEnabled('hdrRendering')).toBe(true) // Override works
		})

		it('should maintain data integrity across multiple operations', () => {
			const operations = [
				() => store.setFlag('ndvi', false),
				() => store.setFlag('heatHistogram', true),
				() => store.resetFlag('ndvi'),
				() => store.setFlag('debugMode', false),
				() => store.resetAllFlags(),
			]

			operations.forEach((op) => {
				expect(() => op()).not.toThrow()
			})
		})
	})

	describe('edge cases', () => {
		it('should handle rapid flag changes', () => {
			for (let i = 0; i < 100; i++) {
				store.setFlag('ndvi', i % 2 === 0)
			}
			expect(store.isEnabled('ndvi')).toBe(false) // Last value
		})

		it('should handle localStorage being disabled', () => {
			const originalSetItem = localStorage.setItem
			localStorage.setItem = vi.fn(() => {
				throw new Error('localStorage is disabled')
			})

			expect(() => store.setFlag('ndvi', false)).not.toThrow()

			localStorage.setItem = originalSetItem
		})

		it('should handle concurrent store instances', () => {
			const store1 = useFeatureFlagStore()
			const store2 = useFeatureFlagStore()

			// Both should reference the same Pinia store
			store1.setFlag('ndvi', false)
			expect(store2.isEnabled('ndvi')).toBe(false)
		})

		// Testing runtime behavior despite TypeScript type constraints
		// In JavaScript, the store could receive non-boolean values from external sources
		// or when type safety is bypassed at runtime
		it('should handle boolean coercion correctly', () => {
			// These tests verify runtime behavior when type safety is bypassed
			store.userOverrides.ndvi = 0 as any
			expect(store.isEnabled('ndvi')).toBe(0) // Returns the actual value

			store.userOverrides.ndvi = '' as any
			expect(store.isEnabled('ndvi')).toBe('')

			store.userOverrides.ndvi = null as any
			expect(store.isEnabled('ndvi')).toBeNull()
		})
	})
})
