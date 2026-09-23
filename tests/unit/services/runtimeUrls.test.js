/**
 * Runtime URLs must resolve the same on every page path (#994).
 *
 * The SPA is served for any path (nginx `try_files … /index.html`, Vite's SPA
 * fallback). A page-relative URL such as `./assets/data/hsy_po.json` therefore
 * resolves under whatever path the page happens to be on: on `/a/b` it asks
 * for `/a/assets/data/hsy_po.json`, gets `index.html`, and the #813 guard in
 * `loadGeoJsonDataSource` quietly returns no entities. The files live in
 * `public/assets/` and `vite.config.js` sets no `base`, so `/assets/...` is
 * always right.
 *
 * The same reasoning covers `/oauth2/*`: Envoy's OIDC filter implements only
 * `/oauth2/callback` and `/oauth2/sign_out` (infrastructure
 * `r4c-cesium-viewer-security-policy.yaml`), and nginx adds only
 * `= /oauth2/userinfo`. Any other `/oauth2/*` path gets the SPA shell, where
 * `CesiumViewer.vue` skips viewer init (#819), so the user lands on a page
 * with no map.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO_ROOT = join(__dirname, '..', '..', '..')
const SRC_DIR = join(REPO_ROOT, 'src')

function sourceFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) return sourceFiles(path)
		return /\.(js|ts|vue)$/.test(name) ? [path] : []
	})
}

const FILES = sourceFiles(SRC_DIR).map((path) => ({
	file: relative(REPO_ROOT, path),
	text: readFileSync(path, 'utf8'),
}))

const lineOf = (text, index) => text.slice(0, index).split('\n').length

/**
 * Split the argument list of the call whose `(` is at `open` into top-level
 * argument strings. Tracks nesting and string/template literals so commas
 * inside them do not split.
 */
function callArguments(text, open) {
	const args = []
	let depth = 0
	let quote = null
	let start = open + 1
	for (let i = open; i < text.length; i++) {
		const ch = text[i]
		if (quote) {
			if (ch === '\\') i++
			else if (ch === quote) quote = null
			continue
		}
		if (ch === "'" || ch === '"' || ch === '`') quote = ch
		else if ('([{'.includes(ch)) depth++
		else if (')]}'.includes(ch)) {
			depth--
			if (depth === 0) {
				args.push(text.slice(start, i).trim())
				return args
			}
		} else if (ch === ',' && depth === 1) {
			args.push(text.slice(start, i).trim())
			start = i + 1
		}
	}
	return args
}

/** URL-taking calls and the index of their URL argument. */
const URL_CALLS = [
	{ pattern: /\bfetch\(/g, urlArg: 0 },
	{ pattern: /\bloadGeoJsonDataSource\(/g, urlArg: 1 },
]

/** Every string-literal URL argument passed to a URL-taking call in src/. */
const literalUrlArguments = FILES.flatMap(({ file, text }) =>
	URL_CALLS.flatMap(({ pattern, urlArg }) =>
		[...text.matchAll(pattern)].flatMap((match) => {
			const open = match.index + match[0].length - 1
			const arg = callArguments(text, open)[urlArg] ?? ''
			const literal = /^(['"`])(.*)\1$/s.exec(arg)
			return literal ? [{ where: `${file}:${lineOf(text, match.index)}`, url: literal[2] }] : []
		})
	)
)

describe('static sweep: runtime URLs are not page-relative (#994)', () => {
	it('finds the literal URL arguments it is meant to check (control)', () => {
		// userStore.ts fetches '/oauth2/userinfo'; if the parser stops seeing it,
		// the next assertion passes vacuously.
		expect(literalUrlArguments.map((a) => a.url)).toContain('/oauth2/userinfo')
	})

	it('no fetch/loadGeoJsonDataSource literal URL is page-relative', () => {
		const pageRelative = literalUrlArguments
			.filter(({ url }) => !/^(\/|https?:\/\/|data:|blob:|\$\{)/.test(url))
			.map(({ where, url }) => `${where} ${url}`)
		expect(pageRelative).toEqual([])
	})

	it('no string literal in src/ starts with a page-relative assets/ path', () => {
		const offenders = FILES.flatMap(({ file, text }) =>
			[...text.matchAll(/(['"`])(\.\/)?assets\//g)].map(
				(match) => `${file}:${lineOf(text, match.index)}`
			)
		)
		expect(offenders).toEqual([])
	})

	it('every /oauth2/* path in src/ is one that Envoy or nginx serves', () => {
		const SERVED = new Set([
			'callback', // Envoy OIDC redirectURL
			'sign_out', // Envoy OIDC logoutPath
			'userinfo', // nginx `location = /oauth2/userinfo`
		])
		const unserved = FILES.flatMap(({ file, text }) =>
			[...text.matchAll(/(['"`])\/oauth2\/([a-z_]+)/g)]
				.filter((match) => !SERVED.has(match[2]))
				.map((match) => `${file}:${lineOf(text, match.index)} /oauth2/${match[2]}`)
		)
		expect(unserved).toEqual([])
	})
})
