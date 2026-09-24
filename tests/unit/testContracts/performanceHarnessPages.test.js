/**
 * Test-suite contract: the performance suite opens pages only through
 * tests/performance/harness.ts, which closes them after every test.
 *
 * A page opened with a raw `browser.newPage()` and closed at the end of the
 * test body stays open when the test times out, and a live Cesium page keeps
 * rendering and fetching tiles through every later test (#961).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const PERF_DIR = join(ROOT, 'tests/performance')
const HARNESS = 'tests/performance/harness.ts'
const RAW_OPEN = /\.(newPage|newContext)\s*\(/g

function findRawOpens(text) {
	return [...text.matchAll(RAW_OPEN)].map(
		(match) => `${text.slice(0, match.index).split('\n').length} ${match[0]}`
	)
}

describe('test-suite contract: performance pages go through the harness', () => {
	const files = readdirSync(PERF_DIR, { recursive: true })
		.filter((entry) => /\.(ts|js)$/.test(entry))
		.map((entry) => relative(ROOT, join(PERF_DIR, entry)))

	it('finds the suite and the harness (guards against a vacuous pass)', () => {
		expect(files).toContain('tests/performance/load.test.ts')
		expect(files).toContain(HARNESS)
		// Control: the harness itself is where pages are opened.
		expect(findRawOpens(readFileSync(join(ROOT, HARNESS), 'utf8')).length).toBeGreaterThan(0)
	})

	it('no performance test opens a page or context outside the harness', () => {
		const rawOpens = files
			.filter((file) => file !== HARNESS)
			.flatMap((file) =>
				findRawOpens(readFileSync(join(ROOT, file), 'utf8')).map((hit) => `${file}:${hit}`)
			)
		expect(rawOpens).toEqual([])
	})
})
