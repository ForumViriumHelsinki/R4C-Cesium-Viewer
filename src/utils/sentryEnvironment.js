/**
 * @module utils/sentryEnvironment
 * Resolve the Sentry `environment` tag for this build.
 *
 * `vite build` always runs in `production` mode, so `MODE` cannot tell the
 * deployed image apart from a local `vite build && vite preview` (#995). The
 * production image declares itself instead: container-build.yml and
 * container-release.yml pass `VITE_SENTRY_ENVIRONMENT=production` as a Docker
 * build arg, and the Dockerfile forwards it to the Vite build.
 *
 * Any other production-mode build is reported as `local`: after #995 no CI
 * build carries a DSN, so an unlabelled build with one is a developer's.
 * Other modes (`development`, `analyze`, …) keep their own name.
 *
 * @param {string | undefined} explicit - `import.meta.env.VITE_SENTRY_ENVIRONMENT`
 * @param {string} mode - `import.meta.env.MODE`
 * @returns {string}
 */
export function resolveSentryEnvironment(explicit, mode) {
	const declared = typeof explicit === 'string' ? explicit.trim() : ''
	if (declared) return declared
	return mode === 'production' ? 'local' : mode
}
