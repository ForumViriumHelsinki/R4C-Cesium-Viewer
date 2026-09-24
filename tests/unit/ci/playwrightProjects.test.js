/**
 * Playwright project contract (#947).
 *
 * The End-to-End CI job ran `playwright test tests/e2e` with no --project, so
 * every project in playwright.config.ts ran. The chromium project's
 * /.*\.spec\.ts/ testMatch also picked up tests/e2e/accessibility, which the
 * three accessibility-* projects (the a11y CI matrix) already run. The job
 * listed 742 tests and was cancelled at its 15-minute timeout on test 19.
 *
 * The End-to-End job is also split into shards (`--shard=i/N` from a matrix),
 * because one worker with two retries cannot run the scoped set inside one
 * 15-minute job. The shard checks read the matrix from test.yml and ask
 * Playwright which tests each shard gets.
 *
 * All checks ask Playwright itself which tests each project and shard collects
 * (`--list`, no browser or server needed) rather than re-implementing its
 * testMatch/testIgnore or sharding rules here.
 */
import { execFile, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const PLAYWRIGHT_BIN = 'node_modules/.bin/playwright'
/** Spec paths in Playwright's JSON report are relative to testDir ('./tests'). */
const A11Y_DIR = 'e2e/accessibility/'
const LIST_TIMEOUT_MS = 60_000
const WORKFLOW = '.github/workflows/test.yml'
const LIST_OPTIONS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }

/**
 * Flatten Playwright's `--list --reporter=json` output into one entry per
 * (test, project) pair it would run.
 * @param {string} stdout
 * @returns {{ id: string, file: string, project: string }[]}
 */
function parseList(stdout) {
	const report = JSON.parse(stdout)
	const entries = []
	const walk = (suite) => {
		for (const spec of suite.specs ?? []) {
			for (const test of spec.tests) {
				entries.push({
					id: `${test.projectName}:${spec.id}`,
					file: spec.file,
					project: test.projectName,
				})
			}
		}
		for (const child of suite.suites ?? []) walk(child)
	}
	for (const suite of report.suites ?? []) walk(suite)
	return entries
}

/**
 * Collect tests with Playwright's own resolver.
 * @param {string[]} args extra `playwright test` arguments (paths, --project)
 */
function listTests(args) {
	const stdout = execFileSync(PLAYWRIGHT_BIN, ['test', ...args, '--list', '--reporter=json'], {
		...LIST_OPTIONS,
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	return parseList(stdout)
}

const execFileAsync = promisify(execFile)

/**
 * Async variant, so the per-shard listings can run concurrently.
 * @param {string[]} args
 * @param {Record<string, string>} env variables added to the environment
 */
async function listTestsAsync(args, env) {
	const { stdout } = await execFileAsync(
		PLAYWRIGHT_BIN,
		['test', ...args, '--list', '--reporter=json'],
		{
			...LIST_OPTIONS,
			env: { ...process.env, ...env },
		}
	)
	return parseList(stdout)
}

const unique = (values) => [...new Set(values)].sort()

/** The `test:e2e` script's arguments after `playwright test`. */
function e2eScriptArgs() {
	const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['test:e2e']
	const argv = script.trim().split(/\s+/)
	expect(argv.slice(0, 2)).toEqual(['playwright', 'test'])
	return argv.slice(2)
}

/**
 * Text of one job in test.yml: its `  <id>:` line up to the next job key.
 * @param {string} jobId
 */
function workflowJob(jobId) {
	const lines = readFileSync(WORKFLOW, 'utf8').split('\n')
	const start = lines.indexOf(`  ${jobId}:`)
	expect(start, `job ${jobId} in ${WORKFLOW}`).toBeGreaterThan(-1)
	const next = lines.findIndex((line, i) => i > start && /^ {2}[\w-]+:\s*$/.test(line))
	return lines.slice(start, next === -1 ? undefined : next).join('\n')
}

/**
 * The End-to-End job's shard matrix and the env its test steps run with.
 * @returns {{ job: string, indices: number[], total: number, ceiling: number, env: Record<string, string> }}
 */
function e2eShardMatrix() {
	const job = workflowJob('e2e-tests')
	const list = (key) => {
		const match = job.match(new RegExp(`^\\s+${key}:\\s*\\[([^\\]]*)\\]\\s*$`, 'm'))
		expect(match, `matrix.${key} in the e2e-tests job`).not.toBeNull()
		return match[1].split(',').map((value) => Number(value.trim()))
	}
	const scalar = (key) => {
		const match = job.match(new RegExp(`^\\s+${key}:\\s*'([^']*)'\\s*$`, 'm'))
		expect(match, `${key} in the e2e-tests job`).not.toBeNull()
		return match[1]
	}
	const totals = list('shardTotal')
	expect(totals).toHaveLength(1)
	return {
		job,
		indices: list('shardIndex'),
		total: totals[0],
		ceiling: Number(scalar('E2E_TEST_CEILING')),
		// Actions sets CI=true in every job, and the shard split depends on it:
		// without CI, cesiumDescribe adds a beforeAll hook, and Playwright then
		// groups that describe's tests in chunks instead of one test per group.
		env: { CI: 'true', SKIP_REQUIRES_DATABASE: scalar('SKIP_REQUIRES_DATABASE') },
	}
}

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
			const entries = listTests(e2eScriptArgs())
			expect(entries.length).toBeGreaterThan(0)
			expect(unique(entries.map((e) => e.project))).toEqual(['chromium'])
			expect(unique(entries.map((e) => e.file).filter((f) => f.startsWith(A11Y_DIR)))).toEqual([])
		},
		LIST_TIMEOUT_MS
	)

	it('the End-to-End matrix runs every shard index exactly once', () => {
		const { job, indices, total } = e2eShardMatrix()

		expect(total).toBeGreaterThan(1)
		expect([...indices].sort((a, b) => a - b)).toEqual(
			Array.from({ length: total }, (_, i) => i + 1)
		)
		expect(job).toMatch(/^\s+fail-fast: false\s*$/m)
		expect(job).toContain(
			// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub Actions expression, matched literally
			'run: bun run test:e2e --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}'
		)
	})

	it(
		'the End-to-End shards split test:e2e so each test runs once and no shard exceeds its share of the ceiling',
		async () => {
			const { indices, total, ceiling, env } = e2eShardMatrix()
			const args = e2eScriptArgs()
			const [all, ...shards] = await Promise.all([
				listTestsAsync(args, env),
				...indices.map((index) => listTestsAsync([...args, `--shard=${index}/${total}`], env)),
			])
			expect(all.length).toBeGreaterThan(0)

			const shardOf = new Map()
			const duplicated = []
			shards.forEach((entries, i) => {
				for (const { id } of entries) {
					if (shardOf.has(id)) duplicated.push(id)
					shardOf.set(id, indices[i])
				}
			})
			expect(duplicated).toEqual([])
			expect(all.filter(({ id }) => !shardOf.has(id)).map(({ id }) => id)).toEqual([])
			expect(shardOf.size).toBe(all.length)

			// The same per-shard ceiling as the workflow's budget step. A shard
			// over it has received a whole large file (sharding by file rather
			// than by test), which one 15-minute job cannot run.
			const shardCeiling = Math.ceil(ceiling / total)
			const sizes = shards.map((entries) => entries.length)
			expect(Math.min(...sizes)).toBeGreaterThan(0)
			expect(Math.max(...sizes)).toBeLessThanOrEqual(shardCeiling)
		},
		LIST_TIMEOUT_MS
	)
})
