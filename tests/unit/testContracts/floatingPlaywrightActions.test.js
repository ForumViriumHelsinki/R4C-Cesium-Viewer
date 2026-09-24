/**
 * Test-suite contract: every Playwright action in tests/ is awaited (or its
 * promise is otherwise consumed).
 *
 * A floating `page.locator(...).click()` asserts nothing: the test moves on
 * before the click happens, and when the page closes the pending action rejects
 * as an unhandled error attributed to whichever test runs next. The concurrent
 * API test in tests/performance/load.test.ts fired four clicks this way (#961).
 *
 * Parsed with the TypeScript compiler API rather than a regex so that awaited,
 * returned, assigned and chained calls are told apart from bare statements.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const TESTS_DIR = join(ROOT, 'tests')

// Playwright Page / Locator / Mouse / Keyboard methods that return a promise
// the caller has to wait for.
const ACTIONS = new Set([
	'check',
	'click',
	'dblclick',
	'fill',
	'goBack',
	'goForward',
	'goto',
	'hover',
	'press',
	'pressSequentially',
	'reload',
	'screenshot',
	'selectOption',
	'setInputFiles',
	'tap',
	'type',
	'uncheck',
	'waitForFunction',
	'waitForLoadState',
	'waitForSelector',
	'waitForTimeout',
	'waitForURL',
])

// Promise combinators that still leave the chain floating when used as a statement.
const CHAIN_METHODS = new Set(['then', 'catch', 'finally'])

// Callbacks passed to these run in the browser, where `el.click()` is the
// synchronous DOM method, not a Playwright action.
const BROWSER_SIDE_CALLS = new Set([
	'$eval',
	'$$eval',
	'addInitScript',
	'evaluate',
	'evaluateHandle',
	'waitForFunction',
])

function calleeName(call) {
	return ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : null
}

/** The call at the root of a `.then()/.catch()/.finally()` chain. */
function rootCall(call) {
	let current = call
	while (
		CHAIN_METHODS.has(calleeName(current)) &&
		ts.isPropertyAccessExpression(current.expression) &&
		ts.isCallExpression(current.expression.expression)
	) {
		current = current.expression.expression
	}
	return current
}

/**
 * Floating Playwright actions in a source text: expression statements whose
 * call (or the root of its promise chain) is a Playwright action.
 * @param {string} text
 * @param {string} [fileName]
 * @returns {{ line: number, code: string }[]}
 */
function findFloatingActions(text, fileName = 'input.ts') {
	const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
	const hits = []

	function visit(node) {
		if (ts.isCallExpression(node) && BROWSER_SIDE_CALLS.has(calleeName(node))) {
			// Walk the receiver (page, locator) but not the browser-side callback.
			visit(node.expression)
			return
		}
		if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
			const call = rootCall(node.expression)
			if (ACTIONS.has(calleeName(call))) {
				const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
				hits.push({ line: line + 1, code: node.getText(source).split('\n')[0].trim() })
			}
		}
		ts.forEachChild(node, visit)
	}

	visit(source)
	return hits
}

// Vitest unit tests run in jsdom, where `el.click()` is the synchronous DOM
// method, not a Playwright action. The exclusion holds only while no file
// under tests/unit imports Playwright; the last case below checks that.
const DOM_ONLY_DIR = 'unit'

const PLAYWRIGHT_IMPORT = /from\s+['"](?:@playwright\/test|playwright(?:-core)?)['"]/

function allTestSourceFiles() {
	return readdirSync(TESTS_DIR, { recursive: true })
		.filter((entry) => /\.(ts|js|mjs)$/.test(entry) && !entry.endsWith('.d.ts'))
		.map((entry) => relative(ROOT, join(TESTS_DIR, entry)))
}

function testSourceFiles() {
	return allTestSourceFiles().filter((file) => file.split(sep)[1] !== DOM_ONLY_DIR)
}

describe('test-suite contract: Playwright actions are awaited', () => {
	it('recognises floating actions and nothing else (control)', () => {
		const text = [
			"page.locator('canvas').click({ position: pos })",
			'page.mouse.click(1, 2).catch(() => {})',
			"await page.locator('canvas').click()",
			'const done = page.goto(url)',
			'return page.waitForSelector("x")',
			'clicks.push(page.mouse.click(1, 2))',
			"await page.evaluate(() => { document.querySelector('button').click() })",
			'await page.waitForFunction(() => { document.body.click(); return true })',
			'tabs.push(page)',
		].join('\n')
		expect(findFloatingActions(text).map((hit) => hit.line)).toEqual([1, 2])
	})

	it('finds the test sources (guards against a vacuous pass)', () => {
		const files = testSourceFiles()
		expect(files).toContain('tests/performance/load.test.ts')
		expect(files).not.toContain('tests/unit/testContracts/floatingPlaywrightActions.test.js')
		expect(files.length).toBeGreaterThan(50)
	})

	it('no jsdom unit test under tests/unit imports Playwright', () => {
		// Assembled so that this file's own text does not match the pattern.
		const quoted = (name) => ['import x from ', `'${name}'`].join('')
		expect(PLAYWRIGHT_IMPORT.test(quoted('@playwright/test'))).toBe(true)
		expect(PLAYWRIGHT_IMPORT.test(quoted('playwright'))).toBe(true)
		expect(PLAYWRIGHT_IMPORT.test(quoted('vitest'))).toBe(false)
		const unitFiles = allTestSourceFiles().filter((file) => file.split(sep)[1] === DOM_ONLY_DIR)
		expect(unitFiles.length).toBeGreaterThan(50)
		const importing = unitFiles.filter((file) =>
			PLAYWRIGHT_IMPORT.test(readFileSync(join(ROOT, file), 'utf8'))
		)
		expect(importing).toEqual([])
	})

	it('no Playwright action under tests/ is left floating', () => {
		const floating = testSourceFiles().flatMap((file) =>
			findFloatingActions(readFileSync(join(ROOT, file), 'utf8'), file).map(
				({ line, code }) => `${file}:${line} ${code}`
			)
		)
		expect(floating).toEqual([])
	})
})
