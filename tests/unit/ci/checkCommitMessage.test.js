/**
 * The squash-commit parse check (scripts/check-commit-message.mjs) against real
 * commits from main.
 *
 * fixtures/squash-commits.json holds, per commit, the PR's current title and
 * body (`gh pr view <n> --json title,body`) and the squash commit message
 * (`git log -1 --format=%B <sha>`). release-please run 35996129826 dropped four
 * of them (#1005, #1010, #1012, #1037); the error strings are copied from its
 * log. On 2026-09-24 those four PR bodies gained a BEGIN_COMMIT_OVERRIDE
 * section, after the merge, and run 36005789211 then parsed every commit. #973
 * (e156d1f) is the fenced-code-block case recorded in .claude/rules/development.md.
 * #1003, #1007 and #1009 were parsed by run 35996129826 and are the controls.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import {
	buildSquashMessage,
	checkPullRequest,
	commitOverride,
	parseErrors,
	splitMessages,
	wrapBody,
} from '../../../scripts/check-commit-message.mjs'

const SCRIPT = 'scripts/check-commit-message.mjs'
const fixtures = JSON.parse(readFileSync('tests/unit/ci/fixtures/squash-commits.json', 'utf8'))
const dropped = fixtures.filter((f) => f.releasePleaseError)
const parsed = fixtures.filter((f) => !f.releasePleaseError)
const overridden = fixtures.filter((f) => f.body.includes('BEGIN_COMMIT_OVERRIDE'))

/** The PR body as it was at merge time: the override sections were added afterwards. */
const bodyAtMerge = (body) =>
	body.replace(/\n*BEGIN_COMMIT_OVERRIDE[\s\S]*?END_COMMIT_OVERRIDE\n*/, '')

/** GitHub appends Co-authored-by trailers, sometimes after a `---------` line. */
const withoutTrailers = (message) =>
	message.replace(/\n\n(---------\n\n)?(Co-authored-by: .*\n?)+$/, '').trim()

const label = (f) => `#${f.number} (${f.sha})`

describe('fixtures', () => {
	it('cover the four dropped commits, the fenced block and three controls', () => {
		expect(dropped.map((f) => f.number)).toEqual([1012, 1005, 1037, 1010, 973])
		expect(parsed.map((f) => f.number)).toEqual([1009, 1007, 1003])
		expect(overridden.map((f) => f.number)).toEqual([1012, 1005, 1037, 1010])
	})
})

describe('parseErrors on the squash commits in main', () => {
	it.each(
		dropped.map((f) => [label(f), f])
	)('%s fails with the error release-please logged', (_, f) => {
		const errors = parseErrors(f.commitMessage)
		expect(errors.map((e) => e.error)).toEqual([f.releasePleaseError])
		const [{ line, column, text }] = errors
		expect(f.releasePleaseError).toContain(` at ${line}:${column},`)
		expect(text).toBe(f.commitMessage.split('\n')[line - 1])
		expect(text).toMatch(/^\S*\(/)
	})

	it.each(parsed.map((f) => [label(f), f]))('%s parses', (_, f) => {
		expect(parseErrors(f.commitMessage)).toEqual([])
	})
})

describe('buildSquashMessage', () => {
	it.each(
		fixtures.map((f) => [label(f), f])
	)('%s reproduces the squash commit from the PR title and body', (_, f) => {
		const built = buildSquashMessage({ ...f, body: bodyAtMerge(f.body) })
		expect(built.trim()).toBe(withoutTrailers(f.commitMessage))
	})

	it('wraps at 72 columns and drops the indentation of a wrapped line', () => {
		const long = `  - ${'word '.repeat(20).trim()}`
		expect(wrapBody(long).split('\n')).toEqual([
			`- ${'word '.repeat(14).trim()}`,
			'word word word word word word',
		])
	})

	it('leaves fenced code blocks unwrapped', () => {
		const code = `const x = ${'a + '.repeat(30)}1`
		expect(wrapBody(['```js', code, '```'].join('\n'))).toBe(['```js', code, '```'].join('\n'))
	})

	it('is the subject alone when the body is empty', () => {
		expect(buildSquashMessage({ title: 'fix: x', number: 1, body: null })).toBe('fix: x (#1)')
		expect(buildSquashMessage({ title: 'fix: x', number: 1, body: '  \n' })).toBe('fix: x (#1)')
	})
})

describe('checkPullRequest', () => {
	it.each(
		dropped.filter((f) => f.number !== 973).map((f) => [label(f), f])
	)('%s: the body as merged fails only once it is wrapped', (_, f) => {
		const body = bodyAtMerge(f.body)
		const unwrapped = `${f.title} (#${f.number})\n\n${body}`
		expect(parseErrors(unwrapped)).toEqual([])
		const result = checkPullRequest({ ...f, body })
		expect(result.source).toBe('the squash commit message')
		expect(result.errors.map((e) => e.error)).toEqual([f.releasePleaseError])
	})

	it.each(
		overridden.map((f) => [label(f), f])
	)('%s: the BEGIN_COMMIT_OVERRIDE section is parsed instead, and passes', (_, f) => {
		const result = checkPullRequest(f)
		expect(result.source).toBe('the BEGIN_COMMIT_OVERRIDE section')
		expect(result.message).toBe(commitOverride(f.body))
		expect(result.message).toMatch(/^fix|^perf/)
		expect(result.errors).toEqual([])
	})

	it.each(parsed.map((f) => [label(f), f]))('%s: the current PR body passes', (_, f) => {
		expect(checkPullRequest(f).errors).toEqual([])
	})

	it('#973: a fenced block whose code line opens a nested call fails', () => {
		const f = fixtures.find((x) => x.number === 973)
		const [error] = checkPullRequest(f).errors
		expect(error.error).toBe(f.releasePleaseError)
		expect(error.text).toMatch(/^localStorage\.setItem\(/)
	})

	it('passes a fenced block whose lines do not start with a call', () => {
		const body = 'Run it locally:\n\n```sh\nbun run build\n```\n\nNothing else changes.'
		expect(checkPullRequest({ title: 'docs: x', number: 1, body }).errors).toEqual([])
	})

	it('fails a body line that starts with an unclosed call', () => {
		const body = 'What changed:\n\n`useFoo(` is now called once.'
		const [error] = checkPullRequest({ title: 'fix: x', number: 1, body }).errors
		expect(error).toMatchObject({ line: 5, text: '`useFoo(` is now called once.' })
		expect(error.error).toMatch(/valid tokens \[\)\]/)
	})

	it('fails when the 72-column wrap moves an unclosed call to a line start', () => {
		const prefix = 'x'.repeat(60)
		const body = `${prefix} and then \`useFoo(\` is now called once.`
		expect(parseErrors(`fix: x (#1)\n\n${body}`)).toEqual([])
		const [error] = checkPullRequest({ title: 'fix: x', number: 1, body }).errors
		expect(error.text).toBe('`useFoo(` is now called once.')
	})

	it('fails a title that is not a conventional commit', () => {
		const [error] = checkPullRequest({ title: 'Update things', number: 1, body: '' }).errors
		expect(error).toMatchObject({ line: 1, text: 'Update things (#1)' })
	})
})

describe('release-please message handling', () => {
	it('takes the override section the way preprocessCommitMessage does', () => {
		expect(commitOverride('a\nBEGIN_COMMIT_OVERRIDE\nfix: y\nEND_COMMIT_OVERRIDE\nb')).toBe(
			'fix: y'
		)
		expect(commitOverride('BEGIN_COMMIT_OVERRIDE\nfix: y')).toBe('fix: y')
		expect(commitOverride('BEGIN_COMMIT_OVERRIDE\n \nEND_COMMIT_OVERRIDE')).toBe('')
		expect(commitOverride(null)).toBe('')
	})

	it('falls back to the squash message when the override section is empty', () => {
		const body = 'BEGIN_COMMIT_OVERRIDE\nEND_COMMIT_OVERRIDE'
		expect(checkPullRequest({ title: 'fix: x', number: 1, body }).source).toBe(
			'the squash commit message'
		)
	})

	it('splits conventional paragraphs and nested commits, and reports each failure', () => {
		const message = [
			'feat: a (#1)',
			'',
			'Body.',
			'',
			'fix(b): second commit',
			'',
			'`bad(` line',
			'BEGIN_NESTED_COMMIT',
			'fix: nested',
			'',
			'`alsoBad(` line',
			'END_NESTED_COMMIT',
		].join('\n')
		expect(splitMessages(message)).toHaveLength(3)
		const errors = parseErrors(message)
		expect(errors.map((e) => [e.line, e.text])).toEqual([
			[7, '`bad(` line'],
			[11, '`alsoBad(` line'],
		])
	})
})

describe('CLI', () => {
	const run = (env) =>
		spawnSync(process.execPath, [SCRIPT], {
			encoding: 'utf8',
			env: { PATH: process.env.PATH, ...env },
		})

	it('exits 1 with the parser error, the line number and the line', () => {
		const f = fixtures.find((x) => x.number === 1012)
		const result = run({
			PR_TITLE: f.title,
			PR_NUMBER: String(f.number),
			PR_BODY: bodyAtMerge(f.body),
		})
		expect(result.status).toBe(1)
		expect(result.stdout).toContain(
			"::error::release-please cannot parse the squash commit message at line 83: unexpected token '\\n' at 83:70, valid tokens [)]"
		)
		expect(result.stdout).toContain(
			'Line 83: `loadGeoJsonDataSource(` is root-relative or absolute.'
		)
	})

	it('exits 0 on a parsable PR', () => {
		const f = fixtures.find((x) => x.number === 1009)
		const result = run({ PR_TITLE: f.title, PR_NUMBER: String(f.number), PR_BODY: f.body })
		expect(result.status).toBe(0)
		expect(result.stdout).toMatch(/^release-please parses the squash commit message/)
	})

	it('explains an override that a mention of the marker in prose switched on', () => {
		const body = 'Recovery uses a BEGIN_COMMIT_OVERRIDE section in the description.'
		const result = run({ PR_TITLE: 'docs: x', PR_NUMBER: '1', PR_BODY: body })
		expect(result.status).toBe(1)
		expect(result.stdout).toContain(
			'::error::release-please cannot parse the BEGIN_COMMIT_OVERRIDE section at line 1:'
		)
		expect(result.stdout).toContain('a mention in prose counts')
	})

	it('exits 2 without a title or number', () => {
		expect(run({ PR_BODY: 'x' }).status).toBe(2)
	})
})

describe('Squash commit parses job', () => {
	const workflow = parse(readFileSync('.github/workflows/enforce-conventional-commits.yml', 'utf8'))
	const job = workflow.jobs['squash-message']

	it('runs on every event that changes the title, body or head', () => {
		expect(workflow.on.pull_request.types).toEqual(
			expect.arrayContaining(['opened', 'edited', 'synchronize', 'reopened'])
		)
	})

	it('passes PR text through env and never interpolates it into a script', () => {
		const eventField = (field) =>
			// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, matched literally
			'${{ github.event.pull_request.FIELD }}'.replace('FIELD', field)
		const parseStep = job.steps.find((s) => s.env?.PR_BODY)
		expect(parseStep.env).toEqual({
			PR_TITLE: eventField('title'),
			PR_BODY: eventField('body'),
			PR_NUMBER: eventField('number'),
		})
		for (const step of job.steps) expect(step.run ?? '').not.toContain('${{')
	})

	it('installs the parser version package.json pins, which the script runs against', () => {
		const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
		expect(pkg.devDependencies['@conventional-commits/parser']).toBe('0.4.1')
		const install = job.steps.find((s) => s.run?.includes('npm install'))
		expect(install.run).toContain(`.devDependencies["@conventional-commits/parser"]`)
		const installed = JSON.parse(
			execFileSync(process.execPath, [
				'-p',
				'JSON.stringify(require("@conventional-commits/parser/package.json").version)',
			]).toString()
		)
		expect(installed).toBe('0.4.1')
	})
})
