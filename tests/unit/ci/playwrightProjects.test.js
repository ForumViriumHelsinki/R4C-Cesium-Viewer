/**
 * Playwright project contract (#947).
 *
 * The End-to-End CI job ran `playwright test tests/e2e` with no --project, so
 * every project in playwright.config.ts ran. The chromium project's
 * /.*\.spec\.ts/ testMatch also picked up tests/e2e/accessibility, which the
 * three accessibility-* projects (the a11y CI matrix) already run. The job
 * listed 742 tests and was cancelled at its 15-minute timeout on test 19.
 *
 * Both checks ask Playwright itself which tests each project collects
 * (`--list`, no browser or server needed) rather than re-implementing its
 * testMatch/testIgnore rules here.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PLAYWRIGHT_BIN = 'node_modules/.bin/playwright'
/** Spec paths in Playwright's JSON report are relative to testDir ('./tests'). */
const A11Y_DIR = 'e2e/accessibility/'
const LIST_TIMEOUT_MS = 60_000

/**
 * Collect tests with Playwright's own resolver and return one entry per
 * (spec file, project) pair it would run.
 * @param {string[]} args extra `playwright test` arguments (paths, --project)
 * @returns {{ file: string, project: string }[]}
 */
function listTests(args) {
	const stdout = execFileSync(PLAYWRIGHT_BIN, ['test', ...args, '--list', '--reporter=json'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		maxBuffer: 64 * 1024 * 1024,
	})
	const report = JSON.parse(stdout)
	const entries = []
	const walk = (suite) => {
		for (const spec of suite.specs ?? []) {
			for (const test of spec.tests) entries.push({ file: spec.file, project: test.projectName })
		}
		for (const child of suite.suites ?? []) walk(child)
	}
	for (const suite of report.suites ?? []) walk(suite)
	return entries
}

const unique = (values) => [...new Set(values)].sort()

describe('Playwright project contract', () => {
	it(
		'no spec file runs in both the chromium project and an accessibility-* project',
		() => {
			const entries = listTests([])

			// Guard against a vacuous pass: both kinds of project, and the a11y
			// specs themselves, must be present in the collection.
			expect(entries.some((e) => e.project === 'chromium')).toBe(true)
			expect(entries.some((e) => e.project.startsWith('accessibility-'))).toBe(true)
			expect(entries.some((e) => e.file.startsWith(A11Y_DIR))).toBe(true)

			const projectsByFile = new Map()
			for (const { file, project } of entries) {
				if (!projectsByFile.has(file)) projectsByFile.set(file, new Set())
				projectsByFile.get(file).add(project)
			}
			const overlapping = [...projectsByFile]
				.filter(
					([, projects]) =>
						projects.has('chromium') && [...projects].some((p) => p.startsWith('accessibility-'))
				)
				.map(([file]) => file)
				.sort()

			expect(overlapping).toEqual([])
		},
		LIST_TIMEOUT_MS
	)

	it(
		'the test:e2e script runs only the chromium project and no accessibility spec',
		() => {
			const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['test:e2e']
			const argv = script.trim().split(/\s+/)
			expect(argv.slice(0, 2)).toEqual(['playwright', 'test'])

			const entries = listTests(argv.slice(2))
			expect(entries.length).toBeGreaterThan(0)
			expect(unique(entries.map((e) => e.project))).toEqual(['chromium'])
			expect(unique(entries.map((e) => e.file).filter((f) => f.startsWith(A11Y_DIR)))).toEqual([])
		},
		LIST_TIMEOUT_MS
	)
})
