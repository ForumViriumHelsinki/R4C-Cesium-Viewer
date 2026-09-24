/**
 * Quarantine contract (#998).
 *
 * A Playwright `fixme` keeps a test out of the run without failing it, so a
 * quarantined test disappears from every report unless something points back
 * at it. This contract requires every `fixme` under tests/e2e to carry an issue
 * reference (`#NNN`) in the comment block directly above it or on its own line.
 * The issue is the checklist for taking the test out of quarantine.
 *
 * It scans the source text rather than Playwright's `--list` output: a
 * describe-level `fixme` covers tests that have no call site of their own, and
 * the comment is only in the source.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const E2E_DIR = 'tests/e2e'
const SOURCE_FILE = /\.(ts|js|mjs)$/
/** `test.fixme(`, `cesiumTest.fixme(`, `test.describe.fixme(`, `cesiumTest.describe.fixme(` */
const FIXME_CALL = /\b[\w$]+(?:\.describe)?\.fixme\s*\(/
const ISSUE_REF = /#\d+\b/
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/

/**
 * @param {string} dir
 * @returns {string[]} source files under dir, recursively
 */
function listSourceFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return listSourceFiles(path)
		return SOURCE_FILE.test(entry.name) ? [path] : []
	})
}

/**
 * Find every `fixme` call in a source text and whether it carries an issue
 * reference: on the call's own line, or in the unbroken run of comment lines
 * directly above it.
 * @param {string} source
 * @returns {{ line: number, referenced: boolean }[]} 1-based line numbers
 */
function findFixmeSites(source) {
	const lines = source.split('\n')
	const sites = []
	lines.forEach((text, index) => {
		if (COMMENT_LINE.test(text) || !FIXME_CALL.test(text)) return
		const context = [text]
		for (let above = index - 1; above >= 0 && COMMENT_LINE.test(lines[above]); above--) {
			context.push(lines[above])
		}
		sites.push({ line: index + 1, referenced: context.some((l) => ISSUE_REF.test(l)) })
	})
	return sites
}

describe('e2e fixme quarantine contract (#998)', () => {
	it('detects referenced and unreferenced fixme calls (control)', () => {
		const source = [
			'// Quarantined: fails on every attempt in CI — see #998',
			"test.fixme('referenced by the comment above', async () => {})",
			'',
			"cesiumTest.fixme('no reference', async () => {})",
			'// a reference two lines up does not count across a blank line: #1',
			'',
			"test.describe.fixme('also no reference', () => {})",
			"cesiumTest.describe.fixme('reference on its own line', () => {}) // #42",
			'// test.fixme( mentioned in a comment is not a call site',
			"test('not quarantined', async () => {})",
		].join('\n')

		expect(findFixmeSites(source)).toEqual([
			{ line: 2, referenced: true },
			{ line: 4, referenced: false },
			{ line: 7, referenced: false },
			{ line: 8, referenced: true },
		])
	})

	it('every fixme under tests/e2e carries an issue reference', () => {
		const files = listSourceFiles(E2E_DIR)
		expect(files.length, `no source files found under ${E2E_DIR}`).toBeGreaterThan(0)

		const unreferenced = files.flatMap((file) =>
			findFixmeSites(readFileSync(file, 'utf8'))
				.filter((site) => !site.referenced)
				.map((site) => `${relative('.', file)}:${site.line}`)
		)

		expect(
			unreferenced,
			'Each fixme needs an issue reference (e.g. "// Quarantined: fails on every attempt in CI — see #998") ' +
				'in the comment directly above it, so the quarantine stays on a checklist'
		).toEqual([])
	})
})
