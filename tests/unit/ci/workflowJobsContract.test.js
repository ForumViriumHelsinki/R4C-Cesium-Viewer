/**
 * Workflow contract: every Test Suite job is reported by the summary job, and
 * every uploaded artifact path is produced somewhere in its job.
 *
 * Both failure modes are silent. A job missing from `summary.needs` never
 * appears in the run summary, so its result is read by nobody. An
 * `actions/upload-artifact` path that nothing writes uploads nothing, and
 * without `if: always()` the step does not even run when the job fails. The
 * Performance Tests job had both (#961): it was absent from the summary, and
 * its `performance-results/` upload had no producer.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const WORKFLOW_DIR = join(process.cwd(), '.github/workflows')

// Output directories that tools write by default, so no step names them.
const TOOL_DEFAULT_OUTPUTS = {
	dist: 'vite build outDir',
	'playwright-report': 'Playwright HTML reporter default folder',
	'test-results': 'Playwright default outputDir',
	'.lighthouseci': 'lhci collect/upload working directory',
}

function loadWorkflow(file) {
	return parse(readFileSync(join(WORKFLOW_DIR, file), 'utf8'))
}

/** The literal part of an artifact path: expressions removed, up to the first one. */
function pathStem(path) {
	return path.split('${{')[0].replace(/\/+$/, '').trim()
}

/** All run scripts and env values a job's steps can use to produce a path. */
function jobProducerText(workflow, job) {
	const envValues = (env) => Object.values(env ?? {}).map(String)
	return [
		...envValues(workflow.env),
		...envValues(job.env),
		...(job.steps ?? []).flatMap((step) => [step.run ?? '', ...envValues(step.env)]),
	].join('\n')
}

/**
 * Upload paths in a workflow that no step, env value or tool default produces.
 * @returns {string[]} `job: path` entries
 */
function unproducedUploads(workflow) {
	return Object.entries(workflow.jobs ?? {}).flatMap(([jobName, job]) => {
		const producers = jobProducerText(workflow, job)
		return (job.steps ?? [])
			.filter((step) => String(step.uses ?? '').startsWith('actions/upload-artifact@'))
			.flatMap((step) => String(step.with?.path ?? '').split('\n'))
			.map((path) => path.trim())
			.filter((path) => path && !path.startsWith('!'))
			.filter((path) => {
				const stem = pathStem(path)
				return !(stem in TOOL_DEFAULT_OUTPUTS) && !producers.includes(stem)
			})
			.map((path) => `${jobName}: ${path}`)
	})
}

describe('GitHub workflow contract: jobs and artifacts', () => {
	const testSuite = loadWorkflow('test.yml')
	const jobNames = Object.keys(testSuite.jobs)

	it('parses the Test Suite jobs (guards against a vacuous pass)', () => {
		expect(jobNames).toEqual(expect.arrayContaining(['build', 'unit-tests', 'summary']))
		expect(testSuite.jobs.summary.needs.length).toBeGreaterThan(0)
	})

	it('the summary job waits for, and reports, every other Test Suite job', () => {
		const summary = testSuite.jobs.summary
		const summaryScript = summary.steps.map((step) => step.run ?? '').join('\n')
		const missing = jobNames
			.filter((name) => name !== 'summary')
			.filter(
				(name) => !summary.needs.includes(name) || !summaryScript.includes(`needs.${name}.result`)
			)
		expect(missing).toEqual([])
	})

	it('recognises produced and unproduced upload paths (control)', () => {
		// A GitHub Actions expression, not a JS template placeholder.
		const viewport = ['$', '{{ matrix.viewport }}'].join('')
		const workflow = {
			jobs: {
				a11y: {
					steps: [
						{ run: 'bun run test', env: { REPORT: `report-${viewport}` } },
						{ uses: 'actions/upload-artifact@v7', with: { path: `report-${viewport}/` } },
					],
				},
				perf: {
					steps: [
						{ run: 'bun run test:performance' },
						{ uses: 'actions/upload-artifact@v7', with: { path: 'performance-results/' } },
					],
				},
			},
		}
		expect(unproducedUploads(workflow)).toEqual(['perf: performance-results/'])
	})

	it('every uploaded artifact path is produced by its job', () => {
		const files = readdirSync(WORKFLOW_DIR).filter((file) => /\.ya?ml$/.test(file))
		expect(files).toContain('test.yml')
		const unproduced = files.flatMap((file) =>
			unproducedUploads(loadWorkflow(file)).map((entry) => `${file} ${entry}`)
		)
		expect(unproduced).toEqual([])
	})

	it('uploads diagnostics even when the job fails', () => {
		// A diagnostics upload that is skipped on failure is only there on green runs.
		const perfUpload = testSuite.jobs['performance-tests'].steps.find((step) =>
			String(step.uses ?? '').startsWith('actions/upload-artifact@')
		)
		expect(perfUpload?.if).toBe('always()')
	})
})
