/**
 * cesiumSymbols.js must export every Cesium symbol the app reaches (#817).
 *
 * cesiumProvider.initialize() imports src/services/cesiumSymbols.js, a finite
 * list of named re-exports, instead of the `cesium` namespace, so the bundler
 * can drop unused engine code (#959). A symbol missing from that list is
 * `undefined` at runtime. vue-tsc catches the omission at `getCesium()` call
 * sites, but not for code that reaches the module through the untyped
 * `window.__cesium` handle (E2E fixtures and helpers), which fails only when
 * that spec runs.
 *
 * This reproduces the list's regenerate command statically: collect every
 * member read off a Cesium module reference in src/ and in the browser-run
 * test code, and require each to be exported.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SYMBOLS_FILE = 'src/services/cesiumSymbols.js'

const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) return walk(path)
		return /\.(js|ts|vue)$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
	})

const read = (path) => ({ file: relative(ROOT, path), code: readFileSync(path, 'utf-8') })

// Block comments (including inline JSDoc such as `/** @type {Cesium.Entity} */`)
// and whole-line `//` comments name types, not runtime reads.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// Expressions that evaluate to the Cesium module.
const MODULE_SOURCE = String.raw`(?:await\s+)?(?:getCesium\(\)|cesiumProvider\.(?:get|initialize)\(\)|[^;\n]*__cesium\b)`
const ALIAS = new RegExp(
	String.raw`\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*${MODULE_SOURCE}`,
	'g'
)
const DESTRUCTURE = new RegExp(String.raw`\b(?:const|let|var)\s*\{[^}]*\}\s*=\s*${MODULE_SOURCE}`)
// Reads straight off the handle, with no local alias in between.
const DIRECT_READ = /(?:\b__cesium|getCesium\(\))\??\.([A-Za-z_$][\w$]*)/g

/** Every `alias.Member` read in a file, where alias is `Cesium` or a local bound to the module. */
function cesiumReads({ file, code }) {
	const src = stripComments(code)
	const aliases = new Set(['Cesium', ...[...src.matchAll(ALIAS)].map((m) => m[1])])
	const reads = [...src.matchAll(DIRECT_READ)].map((m) => ({ file, name: m[1] }))
	const untracked = []
	// `Cesium` preceded by a dot (`window.Cesium.X`) is the CI mock handle, not
	// the module, so the lookbehind skips it.
	for (const alias of aliases) {
		for (const m of src.matchAll(
			new RegExp(String.raw`(?<![\w$.])${alias}\??\.([A-Za-z_$][\w$]*)`, 'g')
		)) {
			reads.push({ file, name: m[1] })
		}
		if (new RegExp(String.raw`(?<![\w$.])${alias}\??\.?\[`).test(src)) {
			untracked.push(`${file}: computed access on ${alias}`)
		}
	}
	if (DESTRUCTURE.test(src)) untracked.push(`${file}: destructured Cesium module`)
	return { reads, untracked }
}

// src/, minus the export list itself.
const SRC_FILES = walk(join(ROOT, 'src'))
	.map(read)
	.filter(({ file }) => file !== SYMBOLS_FILE)

// Test code that runs in the browser against the real module. Unit and
// integration tests run under Vitest against the mocks in tests/setup.js and
// tests/mocks, whose `Cesium.X` members say nothing about the real module.
const BROWSER_TEST_FILES = walk(join(ROOT, 'tests'))
	.map(read)
	.filter(({ file }) => !/^tests\/(unit|integration|mocks)\/|^tests\/setup\.js$/.test(file))

const exported = () => {
	const source = readFileSync(join(ROOT, SYMBOLS_FILE), 'utf-8')
	const block = source.match(/export\s*\{([^}]*)\}\s*from\s*'cesium'/)
	return new Set(
		(block?.[1] ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	)
}

describe('cesiumSymbols export list covers every Cesium read (#817)', { tags: ['@unit'] }, () => {
	const results = [...SRC_FILES, ...BROWSER_TEST_FILES].map(cesiumReads)
	const reads = results.flatMap((r) => r.reads)

	it('parses the export list and finds Cesium reads', () => {
		// Controls: the parse and the sweep both work, so the subset check below
		// is not passing vacuously.
		expect(exported().size).toBeGreaterThanOrEqual(30)
		expect(exported().has('Viewer')).toBe(true)
		const names = new Set(reads.map((r) => r.name))
		expect(names.has('Cartesian3')).toBe(true)
		// The test-side sweep sees reads through window.__cesium aliases
		// (camera-controls.spec.ts, cesium-fixture.ts).
		expect(reads.some((r) => r.file.startsWith('tests/') && r.name === 'Math')).toBe(true)
		expect(reads.some((r) => r.file.startsWith('tests/') && r.name === 'ShadowMode')).toBe(true)
	})

	it('every Cesium member read in src/ and browser-run tests is exported', () => {
		const symbols = exported()
		const missing = [
			...new Set(reads.filter((r) => !symbols.has(r.name)).map((r) => `${r.name} (${r.file})`)),
		]
		expect(missing).toEqual([])
	})

	it('no Cesium module access the sweep cannot see', () => {
		// Destructuring or computed access would hide reads from the check above.
		expect(results.flatMap((r) => r.untracked)).toEqual([])
	})
})
