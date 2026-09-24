/**
 * Workflow contract: static checks over .github/ YAML that CI itself cannot
 * report, because the failure mode is silent.
 *
 * hashFiles() returns an empty string when its glob matches nothing, so a
 * cache key such as `${{ runner.os }}-bun-${{ hashFiles('**\/bun.lockb') }}`
 * collapses to the constant `Linux-bun-`. The cache is then never re-saved and
 * every job restores an ever-older node_modules, with no warning (#947).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isScalar, parseDocument, visit } from 'yaml'

const WORKFLOW_GLOBS = [
	'.github/workflows/*.yml',
	'.github/workflows/*.yaml',
	'.github/actions/**/action.yml',
	'.github/actions/**/action.yaml',
]

/**
 * Tracked paths matching a glob, using git's own glob pathspec semantics
 * (`*` stays within a directory, a leading `**\/` also matches the root), which
 * is how the Actions runner's hashFiles() resolves patterns.
 * @param {string[]} patterns
 * @returns {string[]}
 */
function trackedFiles(patterns) {
	const pathspecs = patterns.map((p) => `:(glob)${p}`)
	const out = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], { encoding: 'utf8' })
	return out.split('\0').filter(Boolean)
}

/**
 * Every hashFiles() call in a YAML file, with the line it appears on. Walks
 * the parsed document so comments are not matched.
 * @param {string} file
 * @returns {{ file: string, line: number, patterns: string[] }[]}
 */
function hashFilesCalls(file) {
	const text = readFileSync(file, 'utf8')
	const doc = parseDocument(text)
	const calls = []
	visit(doc, {
		Scalar(_key, node) {
			if (!isScalar(node) || typeof node.value !== 'string') return
			for (const match of node.value.matchAll(/hashFiles\(([^)]*)\)/g)) {
				const patterns = [...match[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2])
				const offset = node.range?.[0] ?? 0
				const line = text.slice(0, offset).split('\n').length
				calls.push({ file, line, patterns })
			}
		},
	})
	return calls
}

describe('GitHub workflow contract', () => {
	const files = trackedFiles(WORKFLOW_GLOBS)
	const calls = files.flatMap(hashFilesCalls)

	it('finds the workflow files and their hashFiles() calls (guards against a vacuous pass)', () => {
		expect(files).toContain('.github/workflows/test.yml')
		expect(calls.length).toBeGreaterThan(0)
		// Control: the matcher resolves a pattern that is known to be tracked.
		expect(trackedFiles(['package.json'])).toEqual(['package.json'])
	})

	it('every hashFiles() glob matches at least one tracked file', () => {
		const unmatched = calls.flatMap(({ file, line, patterns }) =>
			patterns
				// A leading '!' excludes paths; it cannot be expected to match anything.
				.filter((pattern) => !pattern.startsWith('!'))
				.filter((pattern) => trackedFiles([pattern]).length === 0)
				.map((pattern) => `${file}:${line} hashFiles('${pattern}')`)
		)
		expect(unmatched).toEqual([])
	})
})
