/**
 * OpenFeature SDK initialization with GOFF web provider.
 * Falls back to InMemoryProvider when GOFF relay is unavailable (local dev).
 */

import { GoFeatureFlagWebProvider } from '@openfeature/go-feature-flag-web-provider'
import { type EvaluationContext, InMemoryProvider, OpenFeature } from '@openfeature/web-sdk'
import { ALL_FLAG_NAMES, FLAG_METADATA } from '@/constants/flagMetadata'
import type { useUserStore } from '@/stores/userStore'
import logger from '@/utils/logger'

const GOFF_ENDPOINT = '/feature-flags'
const GOFF_HEALTH_TIMEOUT_MS = 3000

type UserStore = ReturnType<typeof useUserStore>

/**
 * Build evaluation context from user store state.
 * This context is sent to GOFF for targeting rule evaluation.
 */
function buildEvaluationContext(userStore: UserStore): EvaluationContext {
	return {
		targetingKey: userStore.targetingKey,
		email: userStore.email ?? undefined,
		domain: userStore.domain ?? undefined,
		app: 'r4c-cesium-viewer',
	}
}

/**
 * Build InMemoryProvider flag configuration from fallback defaults.
 * Used when GOFF relay is not available.
 */
function buildFallbackFlags(): Record<
	string,
	{ variants: Record<string, boolean>; defaultVariant: string; disabled: boolean }
> {
	const flags: Record<
		string,
		{ variants: Record<string, boolean>; defaultVariant: string; disabled: boolean }
	> = {}

	for (const name of ALL_FLAG_NAMES) {
		const meta = FLAG_METADATA[name]
		flags[meta.goffId] = {
			variants: {
				enabled: true,
				disabled: false,
			},
			defaultVariant: meta.fallbackDefault ? 'enabled' : 'disabled',
			disabled: false,
		}
	}

	return flags
}

/**
 * Check if GOFF relay is reachable before attempting to use it.
 */
async function isGoffAvailable(): Promise<boolean> {
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), GOFF_HEALTH_TIMEOUT_MS)

		const response = await fetch(`${GOFF_ENDPOINT}/health`, {
			signal: controller.signal,
		})
		clearTimeout(timeout)
		return response.ok
	} catch {
		return false
	}
}

/**
 * Initialize OpenFeature with the appropriate provider.
 * Attempts GOFF relay first, falls back to InMemoryProvider.
 *
 * @param userStore - The user identity store (must be initialized first)
 */
export async function initializeFeatureFlags(userStore: UserStore): Promise<void> {
	const context = buildEvaluationContext(userStore)

	const goffAvailable = await isGoffAvailable()

	if (goffAvailable) {
		logger.info('Feature flags: connecting to GOFF relay')
		const provider = new GoFeatureFlagWebProvider({
			endpoint: GOFF_ENDPOINT,
		})

		await OpenFeature.setContext(context)

		try {
			await OpenFeature.setProviderAndWait(provider)
			logger.info('Feature flags: GOFF provider initialized')
		} catch (error) {
			logger.warn('Feature flags: GOFF provider failed, falling back to defaults', error)
			const fallbackProvider = new InMemoryProvider(buildFallbackFlags())
			await OpenFeature.setProviderAndWait(fallbackProvider)
		}
	} else {
		logger.info('Feature flags: GOFF relay unavailable, using fallback defaults')
		await OpenFeature.setContext(context)
		const fallbackProvider = new InMemoryProvider(buildFallbackFlags())
		await OpenFeature.setProviderAndWait(fallbackProvider)
	}
}

/**
 * Get the OpenFeature client for flag evaluation.
 */
export function getClient() {
	return OpenFeature.getClient()
}

/**
 * Update evaluation context (e.g., after user info changes).
 */
export async function updateContext(userStore: UserStore): Promise<void> {
	const context = buildEvaluationContext(userStore)
	await OpenFeature.setContext(context)
}
