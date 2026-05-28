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
 * `new URL(endpoint)` directly in `connectWebsocket()`, `fetchAll()`, and the
 * data collector. Any of those throw `TypeError: Failed to construct 'URL':
 * Invalid URL` if the endpoint is missing, empty, or relative. Build the
 * endpoint from `window.location.origin` so dev (Vite proxy), preview, and
 * prod (nginx proxy) all route through the same `/feature-flags` path.
 *
 * `VITE_GOFF_ENDPOINT` lets ops override the endpoint without rebuilding.
 * Validate both paths with `isValidGoffEndpoint()` before handing the value
 * to the provider — see #738 for the failure mode this guard prevents.
 */
function resolveGoffEndpoint(): string {
	const override = import.meta.env.VITE_GOFF_ENDPOINT
	if (typeof override === 'string' && override.length > 0) {
		return override
	}
	if (typeof window !== 'undefined' && window.location?.origin) {
		return `${window.location.origin}/feature-flags`
	}
	return ''
}

const GOFF_ENDPOINT = resolveGoffEndpoint()
const GOFF_HEALTH_TIMEOUT_MS = 3000

/**
 * Validate that a value is a non-empty absolute URL the GOFF library can
 * consume. The library calls `new URL(endpoint)` in three hot paths
 * (`connectWebsocket`, `fetchAll`, `collectData`); each throws synchronously
 * inside an async function on bad input, surfacing as an unhandled rejection
 * (#738, 172 anonymous Sentry events across 22 fingerprints).
 *
 * Empty strings and protocol-relative paths (`/feature-flags`) are rejected
 * outright. `URL.canParse` (Node 19+, all modern browsers) is the canonical
 * test — fall back to a try/catch for older engines.
 */
export function isValidGoffEndpoint(value: unknown): value is string {
	if (typeof value !== 'string' || value.length === 0) {
		return false
	}
	// `URL.canParse` requires the value to be an absolute URL. Without a base
	// argument, relative paths like `/feature-flags` return false — which is
	// exactly what we want; the GOFF library will throw on them downstream.
	if (typeof URL.canParse === 'function') {
		return URL.canParse(value)
	}
	try {
		// `new URL(value)` without a base throws on relative URLs.
		new URL(value)
		return true
	} catch {
		return false
	}
}

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
 *
 * In development mode every flag is enabled so new features are visible by
 * default in `bun run dev` without a GOFF relay. This mirrors the optimistic
 * initial state in `buildInitialEvaluations` (featureFlagStore.ts) so the
 * `refreshFlags()` call doesn't silently undo the dev-mode default. Production
 * still uses `fallbackDefault` so experimental flags stay gated if the relay
 * goes down.
 */
function buildFallbackFlags(): Record<
	string,
	{ variants: Record<string, boolean>; defaultVariant: string; disabled: boolean }
> {
	const isDev = import.meta.env.MODE === 'development'
	const flags: Record<
		string,
		{ variants: Record<string, boolean>; defaultVariant: string; disabled: boolean }
	> = {}

	for (const name of ALL_FLAG_NAMES) {
		const meta = FLAG_METADATA[name]
		const enabled = isDev || meta.fallbackDefault
		flags[meta.goffId] = {
			variants: {
				enabled: true,
				disabled: false,
			},
			defaultVariant: enabled ? 'enabled' : 'disabled',
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
	if (!isValidGoffEndpoint(GOFF_ENDPOINT)) {
		// Surface the misconfiguration once so it's traceable in Sentry —
		// don't loop on a value the GOFF library will reject downstream (#738).
		logger.warn(
			`Feature flags: GOFF endpoint is missing or not an absolute URL (${JSON.stringify(GOFF_ENDPOINT)}); falling back to local defaults. Set VITE_GOFF_ENDPOINT to an absolute URL or run with window.location.origin available.`
		)
		Sentry.addBreadcrumb({
			category: 'feature-flags',
			level: 'warning',
			message: 'GOFF endpoint invalid; skipping provider',
			data: { endpoint: GOFF_ENDPOINT },
		})
		return false
	}
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
 * R4C-CESIUM-VIEWER-1Z, #735; R4C-CESIUM-VIEWER-21, #794).
 */
export function isGoffRejection(reason: unknown): boolean {
	const message = describeGoffReason(reason)
	// Three GOFF-specific rejection shapes we want to handle, narrowed so we
	// don't accidentally swallow unrelated rejections from Cesium Ion, Sentry
	// replays, or other websocket-using subsystems:
	//
	//   A) Websocket init failures — require both "websocket" AND a
	//      GOFF-specific fingerprint. "reached when initializing" is the exact
	//      phrasing from index.esm.js' timeout reject path.
	//   B) URL construction failures — `TypeError: Failed to construct 'URL':
	//      Invalid URL`. The GOFF library calls `new URL(endpoint)` in three
	//      hot paths; if the endpoint is malformed the TypeError surfaces as
	//      an unhandled rejection from the retry loop (#738). The string
	//      "Failed to construct 'URL'" is browser-internal wording — narrow
	//      enough that we only catch the GOFF retry loop in practice. Pair
	//      with a stack-trace check on Error instances so we don't catch
	//      unrelated URL TypeErrors thrown elsewhere on the page.
	//   C) HTTP-error-shaped object rejections — `{response, responseHeaders,
	//      statusCode}`. GOFF's data-collector and fetch paths reject the
	//      background retry promise with an axios-style plain object (no
	//      `.message`, no stack), which slips past the string checks above
	//      and surfaces as `UnhandledRejection: Object captured as promise
	//      rejection with keys: response, responseHeaders, statusCode`
	//      (Sentry R4C-CESIUM-VIEWER-21, #794). Fires reliably on `vite
	//      preview` because vite.config.js' `/feature-flags` proxy lives
	//      under `server.proxy` only — `preview.proxy` is absent, so the
	//      health check returns the SPA's 404 HTML and GOFF rejects. The
	//      three-key fingerprint is specific enough to avoid swallowing
	//      unrelated HTTP-shaped rejections (Cesium fetchJson rejects with
	//      its own RequestErrorEvent shape, not this triple).
	if (
		/websocket/i.test(message) &&
		/go-?feature-?flag|GoFeatureFlag|reached when initializing/i.test(message)
	) {
		return true
	}
	if (
		reason instanceof TypeError &&
		/Failed to construct 'URL'|Invalid URL/i.test(message) &&
		/go-?feature-?flag|GoFeatureFlag/i.test(reason.stack ?? '')
	) {
		return true
	}
	if (typeof reason === 'object' && reason !== null) {
		const r = reason as Record<string, unknown>
		if ('response' in r && 'responseHeaders' in r && 'statusCode' in r) {
			return true
		}
	}
	return false
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
		if (!isGoffRejection(event.reason)) {
			return
		}
		const message = describeGoffReason(event.reason)
		logger.warn('Feature flags: GOFF background rejection (handled)', message)
		Sentry.addBreadcrumb({
			category: 'feature-flags',
			level: 'warning',
			message: 'GOFF background rejection',
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
