/**
 * @module stores/featureFlagStore
 * Manages runtime feature toggles backed by OpenFeature SDK with GOFF relay.
 *
 * Evaluation flow:
 * 1. OpenFeature evaluates flags via GOFF relay (or InMemoryProvider fallback)
 * 2. Results cached in reactive Pinia state
 * 3. localStorage overrides applied on top (dev/admin only)
 * 4. Hardware guards disable unsupported features client-side
 *
 * Public API is preserved for all consumers:
 * - isEnabled(flagName) - primary check
 * - flagsByCategory(category) - for settings panels
 * - categories, experimentalFlags, enabledCount - getters
 * - setFlag, resetFlag, resetAllFlags - override management
 * - exportConfig, importConfig - configuration sharing
 * - checkHardwareSupport - client-side hardware validation
 * - refreshFlags - re-evaluate all flags from OpenFeature
 */

import { defineStore } from 'pinia'
import {
	ALL_FLAG_NAMES,
	type FeatureFlagCategory,
	type FeatureFlagName,
	FLAG_METADATA,
	type FlagMetadata,
} from '@/constants/flagMetadata'
import { getClient } from '@/services/featureFlagProvider'
import logger from '@/utils/logger'
import { validateJSON } from '@/utils/validators'

// Re-export types for consumer compatibility
export type { FeatureFlagCategory, FeatureFlagName } from '@/constants/flagMetadata'

export interface FeatureFlagConfig {
	enabled: boolean
	category: FeatureFlagCategory
	label: string
	description: string
	experimental?: boolean
	requiresSupport?: boolean
}

export type FeatureFlagsMap = Record<FeatureFlagName, FeatureFlagConfig>
export type UserOverridesMap = Partial<Record<FeatureFlagName, boolean>>

export interface FeatureFlagWithName extends FeatureFlagConfig {
	name: FeatureFlagName
}

interface FeatureFlagState {
	/** Cached evaluation results from OpenFeature */
	evaluatedFlags: Record<FeatureFlagName, boolean>
	/** User overrides (stored in localStorage, applied on top of evaluations) */
	userOverrides: UserOverridesMap
	/** Hardware support state for requiresSupport flags */
	hardwareSupport: Partial<Record<FeatureFlagName, boolean>>
	/** Whether flags have been evaluated at least once */
	initialized: boolean
}

export const useFeatureFlagStore = defineStore('featureFlags', {
	state: (): FeatureFlagState => ({
		evaluatedFlags: buildInitialEvaluations(),
		userOverrides: {},
		hardwareSupport: {},
		initialized: false,
	}),

	getters: {
		/**
		 * Check if a feature flag is enabled.
		 * Priority: localStorage override > hardware guard > OpenFeature evaluation
		 */
		isEnabled:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				const meta = FLAG_METADATA[flagName]
				if (!meta) return false

				// Hardware guard: if requires support and not supported, always disabled
				if (meta.requiresSupport && state.hardwareSupport[flagName] === false) {
					return false
				}

				// User override takes precedence
				if (state.userOverrides[flagName] !== undefined) {
					return state.userOverrides[flagName]!
				}

				// OpenFeature evaluation result
				return state.evaluatedFlags[flagName] ?? meta.fallbackDefault
			},

		/**
		 * Compatibility getter: provides flags map matching old FeatureFlagsMap shape.
		 * Used by FeatureFlagsPanel for iteration.
		 */
		flags: (state): FeatureFlagsMap => {
			const result: Partial<FeatureFlagsMap> = {}
			for (const name of ALL_FLAG_NAMES) {
				const meta = FLAG_METADATA[name]
				result[name] = {
					enabled: state.evaluatedFlags[name] ?? meta.fallbackDefault,
					category: meta.category,
					label: meta.label,
					description: meta.description,
					experimental: meta.experimental,
					requiresSupport: meta.requiresSupport,
				}
			}
			return result as FeatureFlagsMap
		},

		/** Get all flags in a specific category */
		flagsByCategory:
			() =>
			(category: FeatureFlagCategory): FeatureFlagWithName[] => {
				return ALL_FLAG_NAMES.filter((name) => FLAG_METADATA[name].category === category)
					.filter((name) => name !== 'showFeaturePanel')
					.map((name) => {
						const meta = FLAG_METADATA[name]
						return {
							name,
							enabled: meta.fallbackDefault,
							category: meta.category,
							label: meta.label,
							description: meta.description,
							experimental: meta.experimental,
							requiresSupport: meta.requiresSupport,
						}
					})
			},

		/** Get all experimental flags */
		experimentalFlags: (): FeatureFlagWithName[] => {
			return ALL_FLAG_NAMES.filter((name) => FLAG_METADATA[name].experimental)
				.filter((name) => name !== 'showFeaturePanel')
				.map((name) => {
					const meta = FLAG_METADATA[name]
					return {
						name,
						enabled: meta.fallbackDefault,
						category: meta.category,
						label: meta.label,
						description: meta.description,
						experimental: meta.experimental,
						requiresSupport: meta.requiresSupport,
					}
				})
		},

		/** Get all available categories */
		categories: (): FeatureFlagCategory[] => {
			const cats = new Set<FeatureFlagCategory>()
			for (const name of ALL_FLAG_NAMES) {
				if (name === 'showFeaturePanel') continue
				cats.add(FLAG_METADATA[name].category)
			}
			return Array.from(cats).sort()
		},

		/** Get count of enabled flags */
		enabledCount(state): number {
			return ALL_FLAG_NAMES.filter((name) => {
				if (name === 'showFeaturePanel') return false
				const meta = FLAG_METADATA[name]
				if (meta.requiresSupport && state.hardwareSupport[name] === false) return false
				if (state.userOverrides[name] !== undefined) return state.userOverrides[name]
				return state.evaluatedFlags[name] ?? meta.fallbackDefault
			}).length
		},

		/** Check if a flag has been overridden by the user */
		hasOverride:
			(state) =>
			(flagName: FeatureFlagName): boolean => {
				return state.userOverrides[flagName] !== undefined
			},
	},

	actions: {
		/** Set a feature flag override at runtime */
		setFlag(flagName: FeatureFlagName, enabled: boolean): void {
			if (FLAG_METADATA[flagName]) {
				this.userOverrides[flagName] = enabled
				this.persistOverrides()
			}
		},

		/** Reset a feature flag to its evaluated value */
		resetFlag(flagName: FeatureFlagName): void {
			delete this.userOverrides[flagName]
			this.persistOverrides()
		},

		/** Reset all feature flags to evaluated values */
		resetAllFlags(): void {
			this.userOverrides = {}
			this.persistOverrides()
		},

		/** Persist user overrides to localStorage */
		persistOverrides(): void {
			try {
				localStorage.setItem('featureFlags', JSON.stringify(this.userOverrides))
			} catch (error) {
				logger.warn('Failed to persist feature flag overrides:', error)
			}
		},

		/** Load user overrides from localStorage */
		loadOverrides(): void {
			try {
				const stored = localStorage.getItem('featureFlags')
				if (stored) {
					const parsed = validateJSON(stored)
					this.userOverrides = parsed as UserOverridesMap
				}
			} catch (error) {
				logger.warn('Failed to load feature flag overrides:', error)
				try {
					localStorage.removeItem('featureFlags')
				} catch (cleanupError) {
					logger.warn('Failed to clear corrupted feature flags:', cleanupError)
				}
			}
		},

		/**
		 * Re-evaluate all flags from OpenFeature client.
		 * Called after provider initialization and on context changes.
		 */
		refreshFlags(): void {
			try {
				const client = getClient()
				for (const name of ALL_FLAG_NAMES) {
					const meta = FLAG_METADATA[name]
					const value = client.getBooleanValue(meta.goffId, meta.fallbackDefault)
					this.evaluatedFlags[name] = value
				}
				this.initialized = true
				logger.debug('Feature flags refreshed from OpenFeature')
			} catch (error) {
				logger.warn('Failed to refresh feature flags:', error)
			}
		},

		/** Check hardware support for a feature and disable if not supported */
		checkHardwareSupport(flagName: FeatureFlagName, isSupported: boolean): void {
			const meta = FLAG_METADATA[flagName]
			if (meta?.requiresSupport) {
				this.hardwareSupport[flagName] = isSupported
				if (!isSupported) {
					logger.info(`Feature '${flagName}' disabled: hardware not supported`)
				}
			}
		},

		/** Get feature flag metadata */
		getFlagMetadata(flagName: FeatureFlagName): FlagMetadata | null {
			return FLAG_METADATA[flagName] || null
		},

		/** Export current configuration as JSON */
		exportConfig(): Record<FeatureFlagName, boolean> {
			const config: Partial<Record<FeatureFlagName, boolean>> = {}
			for (const name of ALL_FLAG_NAMES) {
				if (name === 'showFeaturePanel') continue
				config[name] = this.isEnabled(name)
			}
			return config as Record<FeatureFlagName, boolean>
		},

		/** Import configuration from JSON */
		importConfig(config: Partial<Record<FeatureFlagName, boolean>>): void {
			Object.entries(config).forEach(([name, enabled]) => {
				const flagName = name as FeatureFlagName
				if (FLAG_METADATA[flagName] && typeof enabled === 'boolean') {
					this.setFlag(flagName, enabled)
				} else if (!FLAG_METADATA[flagName]) {
					logger.warn(`Unknown feature flag "${name}" in imported configuration`)
				} else if (typeof enabled !== 'boolean') {
					logger.warn(
						`Invalid value for feature flag "${name}": expected boolean, got ${typeof enabled}`
					)
				}
			})
		},
	},
})

/**
 * Build initial evaluation state from fallback defaults.
 * Before OpenFeature is initialized, flags use their fallback values.
 */
function buildInitialEvaluations(): Record<FeatureFlagName, boolean> {
	const result: Partial<Record<FeatureFlagName, boolean>> = {}
	for (const name of ALL_FLAG_NAMES) {
		result[name] = FLAG_METADATA[name].fallbackDefault
	}
	return result as Record<FeatureFlagName, boolean>
}
