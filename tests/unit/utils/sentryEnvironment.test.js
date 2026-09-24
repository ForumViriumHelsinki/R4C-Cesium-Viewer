/**
 * Sentry environment tagging (#995).
 *
 * `Sentry.init` used `environment: import.meta.env.MODE`. `vite build` runs in
 * `production` mode, so every build with a DSN reported as `production`,
 * including the CI builds served by `vite preview` on :4173 (the source of
 * the localhost events in #794 and #906).
 *
 * The contract pinned here:
 *  1. `production` is reported only when `VITE_SENTRY_ENVIRONMENT` says so.
 *  2. `src/` never derives the Sentry environment from `MODE` directly.
 *  3. Only the production image workflows build with a DSN, and they declare
 *     `VITE_SENTRY_ENVIRONMENT=production`; the Dockerfile forwards it to Vite.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveSentryEnvironment } from '@/utils/sentryEnvironment.js'

const REPO_ROOT = join(__dirname, '..', '..', '..')
const read = (path) => readFileSync(join(REPO_ROOT, path), 'utf8')

describe('resolveSentryEnvironment (#995)', () => {
	it('uses VITE_SENTRY_ENVIRONMENT when it is set', () => {
		expect(resolveSentryEnvironment('production', 'production')).toBe('production')
		expect(resolveSentryEnvironment('ci', 'production')).toBe('ci')
		expect(resolveSentryEnvironment(' production ', 'production')).toBe('production')
	})

	it('reports an unlabelled production-mode build as local, not production', () => {
		expect(resolveSentryEnvironment(undefined, 'production')).toBe('local')
		expect(resolveSentryEnvironment('', 'production')).toBe('local')
	})

	it('keeps other Vite modes as their own environment', () => {
		expect(resolveSentryEnvironment(undefined, 'development')).toBe('development')
		expect(resolveSentryEnvironment(undefined, 'analyze')).toBe('analyze')
	})

	it('never reports production unless the variable says so', () => {
		for (const explicit of [undefined, '', '   ']) {
			for (const mode of ['production', 'development', 'test', 'analyze', 'staging']) {
				expect(resolveSentryEnvironment(explicit, mode)).not.toBe('production')
			}
		}
	})
})

describe('static sweep: where the Sentry environment comes from (#995)', () => {
	it('src/ never tags Sentry with the Vite MODE directly', () => {
		const offenders = []
		const walk = (dir) => {
			for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
				const path = `${dir}/${entry.name}`
				if (entry.isDirectory()) walk(path)
				else if (/\.(js|ts|vue)$/.test(entry.name)) {
					read(path)
						.split('\n')
						.forEach((line, i) => {
							if (/environment:\s*import\.meta\.env\.MODE\b/.test(line)) {
								offenders.push(`${path}:${i + 1}`)
							}
						})
				}
			}
		}
		walk('src')
		expect(offenders).toEqual([])
	})

	it('Sentry.init resolves its environment through resolveSentryEnvironment', () => {
		expect(read('src/main.js')).toMatch(
			/resolveSentryEnvironment\(\s*import\.meta\.env\.VITE_SENTRY_ENVIRONMENT,\s*import\.meta\.env\.MODE\s*\)/
		)
	})

	/** Workflows that build the deployed image; the only ones allowed a DSN. */
	const PRODUCTION_IMAGE_WORKFLOWS = ['container-build.yml', 'container-release.yml']
	const workflows = readdirSync(join(REPO_ROOT, '.github/workflows')).filter((f) =>
		/\.ya?ml$/.test(f)
	)

	it('only the production image workflows build with a Sentry DSN', () => {
		const withDsn = workflows.filter((f) =>
			read(`.github/workflows/${f}`).includes('VITE_SENTRY_DSN')
		)
		expect(withDsn.sort()).toEqual([...PRODUCTION_IMAGE_WORKFLOWS].sort())
	})

	it('the production image workflows declare VITE_SENTRY_ENVIRONMENT=production', () => {
		for (const f of PRODUCTION_IMAGE_WORKFLOWS) {
			expect(read(`.github/workflows/${f}`), f).toMatch(
				/^\s*VITE_SENTRY_ENVIRONMENT=production\s*$/m
			)
		}
	})

	it('the Dockerfile forwards VITE_SENTRY_ENVIRONMENT to the Vite build without a default', () => {
		const dockerfile = read('Dockerfile')
		expect(dockerfile).toMatch(/^ARG VITE_SENTRY_ENVIRONMENT$/m)
		expect(dockerfile).toMatch(/^ENV VITE_SENTRY_ENVIRONMENT=\$\{VITE_SENTRY_ENVIRONMENT\}$/m)
	})
})
