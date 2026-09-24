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
 * The accessibility job has the same problem once per viewport: 125 tests per
 * accessibility-* project, and mobile reached test 49 before the 15-minute
 * timeout. Its matrix is viewport x shard, and the same checks apply to each
 * viewport.
 *
 * All checks ask Playwright itself which tests each project and shard collects
 * (`--list`, no browser or server needed) rather than re-implementing its
 * testMatch/testIgnore or sharding rules here.
 */
import { execFile, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

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

/**
 * A package.json script's arguments after `playwright test`.
 * @param {string} name script name, e.g. `test:e2e`
 */
function scriptArgs(name) {
	const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts[name]
	expect(script, `package.json script ${name}`).toBeTypeOf('string')
	const argv = script.trim().split(/\s+/)
	expect(argv.slice(0, 2)).toEqual(['playwright', 'test'])
	return argv.slice(2)
}

/** The `test:e2e` script's arguments after `playwright test`. */
function e2eScriptArgs() {
	return scriptArgs('test:e2e')
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

/**
 * Every test of the unsharded listing lands in exactly one shard.
 * @param {{ id: string }[]} all the unsharded listing
 * @param {{ id: string }[][]} shards one listing per shard
 * @param {string} label names the run in failure messages
 */
function expectEachTestInOneShard(all, shards, label) {
	const seen = new Set()
	const duplicated = []
	for (const entries of shards) {
		for (const { id } of entries) {
			if (seen.has(id)) duplicated.push(id)
			seen.add(id)
		}
	}
	expect(duplicated, `${label}: tests in more than one shard`).toEqual([])
	expect(
		all.filter(({ id }) => !seen.has(id)).map(({ id }) => id),
		`${label}: tests in no shard`
	).toEqual([])
	expect(seen.size, `${label}: sharded vs unsharded test count`).toBe(all.length)
}

const A11Y_JOB = 'accessibility-tests'

/** GitHub Actions expression text, e.g. expr('matrix.viewport') is `${{ matrix.viewport }}`. */
const expr = (inner) => ['$', `{{ ${inner} }}`].join('')

/**
 * The accessibility job and the summary job from test.yml, parsed.
 * @returns {{ job: any, summary: any, viewports: string[], indices: number[], total: number, env: Record<string, string> }}
 */
function a11yShardMatrix() {
	const workflow = parse(readFileSync(WORKFLOW, 'utf8'))
	const job = workflow.jobs[A11Y_JOB]
	expect(job, `job ${A11Y_JOB} in ${WORKFLOW}`).toBeDefined()
	const matrix = job.strategy?.matrix ?? {}
	expect(matrix.shardTotal, 'matrix.shardTotal in the accessibility job').toHaveLength(1)
	return {
		job,
		summary: workflow.jobs.summary,
		viewports: matrix.viewport ?? [],
		indices: matrix.shardIndex ?? [],
		total: matrix.shardTotal[0],
		// CI=true as in the End-to-End check: Actions sets it in every job, and
		// the shard split depends on it (cesiumDescribe's local beforeAll).
		env: { CI: 'true', SKIP_REQUIRES_DATABASE: String(job.env?.SKIP_REQUIRES_DATABASE) },
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
			expectEachTestInOneShard(all, shards, 'test:e2e')

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

	it('the accessibility matrix runs every viewport and every shard index exactly once', () => {
		const { job, viewports, indices, total } = a11yShardMatrix()

		expect([...viewports].sort()).toEqual(['desktop', 'mobile', 'tablet'])
		expect(total).toBeGreaterThan(1)
		expect([...indices].sort((a, b) => a - b)).toEqual(
			Array.from({ length: total }, (_, i) => i + 1)
		)
		// A failing or timed-out shard must not cancel the other legs.
		expect(job.strategy['fail-fast']).toBe(false)
		const runs = job.steps.map((step) => step.run ?? '').join('\n')
		expect(runs).toContain(
			`bun run test:accessibility:${expr('matrix.viewport')} -- --shard=${expr('matrix.shardIndex')}/${expr('matrix.shardTotal')}`
		)
		// Each leg reports as its own check. Without every matrix value in the
		// job name, the shards of one viewport share a check name.
		for (const key of Object.keys(job.strategy.matrix)) {
			expect(job.name).toContain(expr(`matrix.${key}`))
		}
	})

	it('each accessibility shard uploads its report under its own artifact name', () => {
		const { job } = a11yShardMatrix()
		const uploads = job.steps.filter((step) =>
			String(step.uses ?? '').startsWith('actions/upload-artifact@')
		)
		expect(uploads.length).toBeGreaterThan(0)
		// upload-artifact v4 and later refuse a second artifact of the same name
		// in one run, so a name missing a matrix dimension fails every leg but one.
		for (const upload of uploads) {
			for (const key of Object.keys(job.strategy.matrix)) {
				expect(upload.with?.name).toContain(expr(`matrix.${key}`))
			}
		}
	})

	it('the Test Summary waits for all accessibility shards and reports their combined result', () => {
		const { summary } = a11yShardMatrix()
		// needs.<matrix job>.result is failure when any leg failed.
		expect(summary.needs).toContain(A11Y_JOB)
		expect(summary.if).toBe('always()')
		const script = summary.steps.map((step) => step.run ?? '').join('\n')
		expect(script).toContain(`needs.${A11Y_JOB}.result`)
	})

	it(
		'the accessibility shards split each viewport so each test runs once and the split is even',
		async () => {
			const { viewports, indices, total, env } = a11yShardMatrix()
			expect(viewports.length).toBeGreaterThan(0)
			for (const viewport of viewports) {
				const args = scriptArgs(`test:accessibility:${viewport}`)
				const [all, ...shards] = await Promise.all([
					listTestsAsync(args, env),
					...indices.map((index) => listTestsAsync([...args, `--shard=${index}/${total}`], env)),
				])
				expect(all.length, viewport).toBeGreaterThan(0)
				expect(unique(all.map((e) => e.project)), viewport).toEqual([`accessibility-${viewport}`])
				expectEachTestInOneShard(all, shards, viewport)

				// Playwright deals shard units out in file order, by count. With one
				// test per unit (fullyParallel on the project) no shard exceeds
				// ceil(n / total); a shard above that has received a whole file.
				const sizes = shards.map((entries) => entries.length)
				expect(Math.min(...sizes), viewport).toBeGreaterThan(0)
				expect(Math.max(...sizes), viewport).toBeLessThanOrEqual(Math.ceil(all.length / total))
			}
		},
		LIST_TIMEOUT_MS * 2
	)
})
