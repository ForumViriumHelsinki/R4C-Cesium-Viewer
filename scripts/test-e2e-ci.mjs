#!/usr/bin/env bun
/**
 * CI-parity E2E/a11y runner (#897).
 *
 * The GitHub Actions a11y/E2E jobs (.github/workflows/test.yml) test a
 * PRODUCTION build served by `bun run preview` on :4173 with CI=true and
 * SKIP_REQUIRES_DATABASE=true. The default local Playwright setup instead
 * auto-starts the DEV server on :5173, where MODE === 'development' flips
 * every feature flag on and the dev server proxies the data endpoints —
 * so dev-mode runs cannot reproduce CI-only failures.
 *
 * This script mirrors the CI environment:
 *   1. production build with VITE_E2E_TEST=true (skip with --skip-build)
 *   2. `bun run preview` serving dist/ on :4173
 *   3. `bunx playwright test` with CI=true + SKIP_REQUIRES_DATABASE=true
 *
 * Usage:
 *   bun run test:e2e:ci -- [--skip-build] [playwright args...]
 *
 * Example (reproduce #897):
 *   bun run test:e2e:ci -- tests/e2e/accessibility/building-filters.spec.ts \
 *     --project=accessibility-tablet -g "non-grid views only" --repeat-each=5
 *
 * Note: :4173 must be free — `vite preview` falls back to another port when
 * the port is taken, and the CI baseURL is hard-wired to :4173.
 */
import { spawn } from 'node:child_process'

const argv = process.argv.slice(2)
const skipBuild = argv.includes('--skip-build')
const playwrightArgs = argv.filter((a) => a !== '--skip-build')

const PREVIEW_URL = 'http://localhost:4173/'

function run(cmd, args, env = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			stdio: 'inherit',
			env: { ...process.env, ...env },
		})
		child.on('exit', (code) => resolve(code ?? 1))
		child.on('error', reject)
	})
}

async function waitForServer(url, timeoutMs = 30000) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		try {
			const res = await fetch(url)
			if (res.ok) return
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500))
	}
	throw new Error(`Preview server did not respond at ${url} within ${timeoutMs}ms`)
}

// 1. Production build with the E2E hook (same artifact as the CI build job)
if (!skipBuild) {
	const code = await run('bun', ['run', 'build'], { VITE_E2E_TEST: 'true' })
	if (code !== 0) process.exit(code)
}

// 2. Serve dist/ on :4173
const preview = spawn('bun', ['run', 'preview'], {
	stdio: ['ignore', 'inherit', 'inherit'],
	env: { ...process.env },
})
const killPreview = () => {
	if (!preview.killed) preview.kill('SIGTERM')
}
process.on('exit', killPreview)
process.on('SIGINT', () => {
	killPreview()
	process.exit(130)
})

let exitCode = 1
try {
	await waitForServer(PREVIEW_URL)

	// 3. CI-parity Playwright run
	exitCode = await run('bunx', ['playwright', 'test', ...playwrightArgs], {
		CI: 'true',
		SKIP_REQUIRES_DATABASE: 'true',
	})
} finally {
	killPreview()
}
process.exit(exitCode)
