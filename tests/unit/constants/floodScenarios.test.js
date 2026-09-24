/**
 * Flood scenario ids and legend palettes live in one module.
 *
 * #159 copied them into BackgroundMapBrowser instead of moving them out of
 * FloodBackgroundSyke, and the copy silently lost three scenarios, a legend
 * entry and the licence attribution (#982). A literal outside the constants
 * module is the start of the next fork, so this sweep fails on one.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROOT, 'src')
const HOME = 'src/constants/floodScenarios.js'

// Scenario id stems (SYKE layer names, also as prefixes) and the SYKE legend colours
const FLOOD_LITERALS = [
	/coastal_flood/,
	/Hulevesitulva/,
	/SSP585_re_with/,
	/#(7ecce6|5498cc|2b66b3|003399|002673|fddbc6|d2ffff)\b/i, // coastal
	/#(82cfff|4589ff|0059c9|002a8e|001141)\b/i, // stormwater (and combined #002a8e)
	/#(b2192b|fde9dc)\b/i, // combined
]

const sourceFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const path = join(dir, e.name)
		if (e.isDirectory()) return sourceFiles(path)
		return /\.(js|ts|vue)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [path] : []
	})

describe('flood scenario constants', { tags: ['@unit'] }, () => {
	const files = sourceFiles(SRC).map((f) => ({
		path: relative(ROOT, f),
		text: readFileSync(f, 'utf8'),
	}))

	it('control: the sweep sees the constants module', () => {
		const home = files.find((f) => f.path === HOME)
		expect(home, HOME).toBeDefined()
		for (const pattern of FLOOD_LITERALS) expect(home.text, String(pattern)).toMatch(pattern)
	})

	it('keeps scenario ids and legend colours out of every other module', () => {
		const offenders = files
			.filter((f) => f.path !== HOME)
			.flatMap((f) =>
				FLOOD_LITERALS.filter((p) => p.test(f.text)).map((p) => `${f.path} ${String(p)}`)
			)
		expect(offenders).toEqual([])
	})
})
