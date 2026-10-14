#!/usr/bin/env node
/**
 * Selects the Analysis panels whose layout a branch can have changed, for
 * tests/e2e/layout/panel-overflow.spec.ts.
 *
 * Each panel in src/constants/analysisRegistry.js is mapped to every module its
 * components reach (tests/unit/contracts/sourceGraph.js). A changed file selects
 * the panels that reach it. A change to the shared shell (sidebar, analysis
 * drawer, theme, styles, dependencies, the check itself) selects every panel.
 *
 * Usage:
 *   node scripts/overflow-targets.mjs [--base <ref>] [--github-output]
 *
 * Prints a comma-separated list of panel ids, `all`, or nothing when no panel is
 * affected. Changed files are `git diff <base>...HEAD` plus uncommitted and
 * untracked files; `--base` defaults to origin/main. `--github-output` also
 * writes `panels=<list>` to $GITHUB_OUTPUT.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, reachableFrom } from '../tests/unit/contracts/sourceGraph.js'

const REGISTRY = 'src/constants/analysisRegistry.js'

/** Files every panel renders inside or is styled by. */
export const SHARED_PATTERNS = [
	/^src\/pages\/ControlPanel\.vue$/,
	/^src\/components\/AnalysisPanel\.vue$/,
	/^src\/constants\/analysisRegistry\.js$/,
	/^src\/main\.js$/,
	/^src\/App\.vue$/,
	/^src\/styles\//,
	/^src\/plugins\//,
	/^vite\.config\.js$/,
	/^package\.json$/,
	/^bun\.lock$/,
	/^playwright\.config\.ts$/,
	/^tests\/e2e\/layout\//,
	/^tests\/e2e\/helpers\/overflow\.ts$/,
	/^scripts\/overflow-targets\.mjs$/,
]

/**
 * Panel id → component files, read from the registry source. The registry
 * imports each component lazily, `const Name = defineAsyncComponent(() =>
 * import('../components/Name.vue'))`, and names the constants in `component:`.
 * @param {string} source registry file contents
 * @returns {Map<string, string[]>} paths relative to the repo root
 */
export const registryComponents = (source) => {
	const paths = new Map(
		[
			...source.matchAll(
				/const (\w+) = defineAsyncComponent\(\s*\(\) => import\('\.\.\/([^']+)'\)\s*\)/g
			),
		].map(([, name, path]) => [name, `src/${path}`])
	)
	const entries = new Map()
	const blocks = source.split(/\n\t\{\n\t\tid: '/).slice(1)
	for (const block of blocks) {
		const id = block.slice(0, block.indexOf("'"))
		const component = block.slice(block.indexOf('component:'))
		const files = [...paths].filter(([name]) => new RegExp(`\\b${name}\\b`).test(component))
		entries.set(
			id,
			files.map(([, path]) => path)
		)
	}
	return entries
}

/**
 * @param {string[]} changed paths relative to the repo root
 * @param {Map<string, Set<string>>} panelFiles panel id → files it reaches
 * @returns {'all' | string[]}
 */
export const selectPanels = (changed, panelFiles) => {
	if (changed.some((file) => SHARED_PATTERNS.some((p) => p.test(file)))) return 'all'
	return [...panelFiles]
		.filter(([, files]) => changed.some((file) => files.has(file)))
		.map(([id]) => id)
}

const git = (...args) =>
	execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)

const changedFiles = (base) => [
	...new Set([
		...git('diff', '--name-only', `${base}...HEAD`),
		...git('diff', '--name-only', 'HEAD'),
		...git('ls-files', '--others', '--exclude-standard'),
	]),
]

const main = () => {
	const args = process.argv.slice(2)
	const baseIndex = args.indexOf('--base')
	const base = baseIndex >= 0 ? args[baseIndex + 1] : 'origin/main'
	const components = registryComponents(readFileSync(join(ROOT, REGISTRY), 'utf8'))
	const panelFiles = new Map([...components].map(([id, files]) => [id, reachableFrom(files)]))
	const selected = selectPanels(changedFiles(base), panelFiles)
	const value = selected === 'all' ? 'all' : selected.join(',')
	console.log(value)
	if (args.includes('--github-output') && process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `panels=${value}\n`)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) main()
