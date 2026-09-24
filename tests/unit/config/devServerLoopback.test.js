/**
 * Dev/preview server bind contract (#969).
 *
 * `vite` and `vite preview` proxy eleven upstreams (vite.config.js `devProxy`),
 * and the /digitransit entry injects `digitransit-subscription-key` server-side.
 * Bound to every interface, either server is a credentialed forward proxy for
 * anyone on the same network. Vite's default bind is loopback, so the contract
 * is that nothing in the repo overrides it: no `--host` on a command that starts
 * a Vite server, and no non-loopback `server.host` / `preview.host` in the
 * config. Device testing opts in per run with `bun run dev -- --host`.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile } from 'vite'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const require = createRequire(import.meta.url)

const HOST_FLAG = /(^|\s)--host(\s|=|$)/
// `vite`, `vite dev|serve|preview`, optionally via bunx/npx. `vite build` does
// not start a server and is filtered out separately.
const STARTS_VITE_SERVER = /(^|[\s;&|])((bunx|npx)\s+)?vite(\s+(dev|serve|preview))?(\s|$)/
const VITE_BUILD = /\bvite\s+build\b/
const LOOPBACK = new Set([undefined, false, 'localhost', '127.0.0.1', '::1'])

const viteServerScripts = () =>
	Object.entries(JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8')).scripts).filter(
		([, cmd]) => STARTS_VITE_SERVER.test(cmd) && !VITE_BUILD.test(cmd)
	)

describe('dev/preview server binds to loopback (#969)', { tags: ['@unit'] }, () => {
	it('no package.json script starts a Vite server with --host', () => {
		const exposed = viteServerScripts()
			.filter(([, cmd]) => HOST_FLAG.test(cmd))
			.map(([name, cmd]) => `${name}: ${cmd}`)
		expect(exposed).toEqual([])
	})

	it('the scan recognises the Vite server scripts it guards', () => {
		// Control: if the matcher stops recognising these, the test above
		// passes vacuously.
		expect(viteServerScripts().map(([name]) => name)).toEqual(
			expect.arrayContaining(['dev', 'dev:test', 'preview'])
		)
	})

	it('the Lighthouse CI preview server does not pass --host', () => {
		const { startServerCommand } = require(resolve(ROOT, 'lighthouserc.cjs')).ci.collect
		expect(startServerCommand).toMatch(STARTS_VITE_SERVER)
		expect(startServerCommand).not.toMatch(HOST_FLAG)
	})

	it('vite.config.js leaves server.host and preview.host at loopback', async () => {
		// Vite's own loader bundles and evaluates the config the way `vite`
		// does, independent of the jsdom test environment's globals.
		const { config } = await loadConfigFromFile(
			{ command: 'serve', mode: 'test' },
			resolve(ROOT, 'vite.config.js'),
			ROOT,
			'silent'
		)
		expect(LOOPBACK.has(config.server?.host)).toBe(true)
		expect(LOOPBACK.has(config.preview?.host)).toBe(true)
		// Control: the credential-injecting route this contract protects is
		// on both servers, so the host assertions guard something real.
		expect(config.server.proxy['/digitransit']).toBeDefined()
		expect(config.preview.proxy['/digitransit']).toBeDefined()
	})
})
