/**
 * OpenFeature SDK initialization with GOFF web provider.
 * Falls back to InMemoryProvider when GOFF relay is unavailable (local dev).
 */

import { GoFeatureFlagWebProvider } from '@openfeature/go-feature-flag-web-provider'
import { type EvaluationContext, InMemoryProvider, OpenFeature } from '@openfeature/web-sdk'
import * as Sentry from '@sentry/vue'
import { ALL_FLAG_NAMES, FLAG_METADATA } from '@/constants/flagMetadata'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import type { useUserStore } from '@/stores/userStore'
import logger from '@/utils/logger'

/**
 * GOFF endpoint must be an absolute URL: the provider's websocket setup calls
 * `new URL(endpoint)` directly, which throws `TypeError: Failed to construct 'URL'`
 * on relative paths. Build it from `window.location.origin` so dev (Vite proxy),
 * preview, and prod (nginx proxy) all route through the same `/feature-flags` path.
 */
const GOFF_ENDPOINT =
	typeof window !== 'undefined' && window.location?.origin
		? `${window.location.origin}/feature-flags`
		: '/feature-flags'
const GOFF_HEALTH_TIMEOUT_MS = 3000

/**
 * GOFF websocket init timeout. The provider's built-in default is 5000 ms,
 * which is too aggressive for cold relay-proxy connections — production
 * traffic surfaces ~26 unhandled-rejection events per day from slow handshakes
 * (Sentry R4C-CESIUM-VIEWER-1Z, #735). Bumped to 15s; override via
 * `VITE_GOFF_TIMEOUT_MS` in environments with consistently slow handshakes.
 * The flag-evaluation path is unaffected — fallback defaults are already
 * applied when init fails or the relay is unreachable.
 */
// Use `|| 15000` (not `??`) so empty string, NaN, and 0 all fall back to the
// default. `apiTimeout: 0` would otherwise make the GOFF library use its
// internal 5000 ms default — the bug this fix addresses.
const GOFF_WEBSOCKET_TIMEOUT_MS = Number(import.meta.env.VITE_GOFF_TIMEOUT_MS) || 15000

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
 *
 * Issue #715 (and infrastructure#1799 for the beta-cluster regression): when
 * the relay is broken upstream (e.g. 502 Bad Gateway), `response.ok` returns
 * false and we cleanly fall back to the InMemoryProvider with `fallbackDefault`
 * values. Log the specific failure mode so the regression is traceable in
 * console output and Sentry breadcrumbs, instead of disappearing behind a
 * silent catch.
 */
async function isGoffAvailable(): Promise<boolean> {
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), GOFF_HEALTH_TIMEOUT_MS)

		const response = await fetch(`${GOFF_ENDPOINT}/health`, {
			signal: controller.signal,
		})
		clearTimeout(timeout)

		if (!response.ok) {
			// statusText can be empty under HTTP/2 — concatenate conditionally.
			const statusLabel = response.statusText
				? `${response.status} ${response.statusText}`
				: `${response.status}`
			logger.warn(
				`Feature flags: GOFF health endpoint returned ${statusLabel}; falling back to local defaults`
			)
			return false
		}
		return true
	} catch (error) {
		// Network error, CORS, abort, etc. — surface the reason so a degraded
		// provider isn't silent in production. Pass the full error object so
		// the logger / Sentry transport can capture the stack trace.
		logger.warn('Feature flags: GOFF health check failed; falling back to local defaults', error)
		return false
	}
}

/**
 * Convert a GOFF rejection reason to a readable string. The library rejects
 * with bare strings ("timeout of 5000 ms reached when initializing the
 * websocket") and Error instances depending on the path.
 */
function describeGoffReason(reason: unknown): string {
	if (reason instanceof Error) return reason.message
	if (typeof reason === 'string') return reason
	try {
		// JSON.stringify returns undefined for undefined/functions/symbols;
		// fall back to String(reason) so the return type is always a string.
		return JSON.stringify(reason) ?? String(reason)
	} catch {
		return String(reason)
	}
}

/**
 * Test whether an unhandled rejection originated from the GOFF provider's
 * background retry/reconnect loop. The library's `initialize()` catches its
 * synchronous failure path, then fires `retryFetchAll()` and
 * `reconnectWebsocket()` **without awaiting** — those returned promises can
 * reject silently and surface as unhandled rejections (Sentry
 * R4C-CESIUM-VIEWER-1Z, #735).
 */
function isGoffWebsocketRejection(reason: unknown): boolean {
	const message = describeGoffReason(reason)
	// Require both:
	//   1) "websocket" — narrows to the websocket-init failure class.
	//   2) one of the GOFF-specific fingerprints:
	//      - library name (defensive against future error wording)
	//      - "reached when initializing" — the exact phrase the library uses
	//        in its timeout reject path (index.esm.js: "timeout of N ms reached
	//        when initializing the websocket"). This phrasing is highly
	//        specific to GOFF, so it won't match Cesium Ion, Sentry replays,
	//        or other websocket-using subsystems.
	// The earlier "impossible to connect" alternative was too generic and
	// risked swallowing unrelated websocket rejections (per code review on #745).
	return (
		/websocket/i.test(message) &&
		/go-?feature-?flag|GoFeatureFlag|reached when initializing/i.test(message)
	)
}

let goffRejectionHandlerInstalled = false

/**
 * Convert GOFF's background-reconnect unhandled rejections into a single
 * warning + Sentry breadcrumb, instead of letting them bubble up as
 * production errors. Idempotent; safe to call multiple times.
 */
function installGoffRejectionHandler(): void {
	if (goffRejectionHandlerInstalled || typeof window === 'undefined') {
		return
	}
	goffRejectionHandlerInstalled = true
	window.addEventListener('unhandledrejection', (event) => {
		if (!isGoffWebsocketRejection(event.reason)) {
			return
		}
		const message = describeGoffReason(event.reason)
		logger.warn('Feature flags: GOFF websocket reconnect failed (handled)', message)
		Sentry.addBreadcrumb({
			category: 'feature-flags',
			level: 'warning',
			message: 'GOFF websocket reconnect failed',
			data: { reason: message },
		})
		event.preventDefault()
	})
}

/**
 * Initialize OpenFeature with the appropriate provider.
 * Attempts GOFF relay first, falls back to InMemoryProvider.
 *
 * @param userStore - The user identity store (must be initialized first)
 */
export async function initializeFeatureFlags(userStore: UserStore): Promise<void> {
	installGoffRejectionHandler()
	const context = buildEvaluationContext(userStore)

	const goffAvailable = await isGoffAvailable()

	if (goffAvailable) {
		logger.info('Feature flags: connecting to GOFF relay')
		const provider = new GoFeatureFlagWebProvider({
			endpoint: GOFF_ENDPOINT,
			apiTimeout: GOFF_WEBSOCKET_TIMEOUT_MS,
		})

		await OpenFeature.setContext(context)

		try {
			await OpenFeature.setProviderAndWait(provider)
			logger.info('Feature flags: GOFF provider initialized')
			useFeatureFlagStore().setProviderSource('goff')
		} catch (error) {
			logger.warn('Feature flags: GOFF provider failed, falling back to defaults', error)
			Sentry.addBreadcrumb({
				category: 'feature-flags',
				level: 'warning',
				message: 'GOFF provider init failed; using fallback defaults',
				data: { reason: describeGoffReason(error) },
			})
			const fallbackProvider = new InMemoryProvider(buildFallbackFlags())
			await OpenFeature.setProviderAndWait(fallbackProvider)
			useFeatureFlagStore().setProviderSource('fallback')
		}
	} else {
		logger.info('Feature flags: GOFF relay unavailable, using fallback defaults')
		await OpenFeature.setContext(context)
		const fallbackProvider = new InMemoryProvider(buildFallbackFlags())
		await OpenFeature.setProviderAndWait(fallbackProvider)
		useFeatureFlagStore().setProviderSource('fallback')
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
