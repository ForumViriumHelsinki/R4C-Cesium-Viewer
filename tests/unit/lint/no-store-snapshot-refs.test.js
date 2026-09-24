/**
 * Static sweep: no `ref(someStore.field)` in src/ (#967).
 *
 * `ref(toggleStore.showTrees)` copies the value once, at setup. Later store writes
 * (smartReset, goHome, another control) never reach the copy, so the switch and the
 * store disagree. Use `storeToRefs(store)` for a two-way binding, or a computed.
 *
 * ast-grep cannot parse .vue files, so this reads the source text.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROOT, 'src')

/** `ref(toggleStore.x)`, `ref(store.x)`, `ref( propsStore.x )` */
const STORE_SNAPSHOT_REF = /\bref\(\s*[A-Za-z_$]*[sS]tore\.[A-Za-z_$][\w$]*\s*\)/

/** file → reason. Each entry must still match, so a fixed site is removed from here. */
const ALLOWED = {
	// A watcher on propsStore.statsIndex copies every store write back into the ref.
	'src/components/StatisticalGridOptions.vue': 'synced by a propsStore.statsIndex watcher',
}

/** @param {string} dir @returns {string[]} */
const sourceFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return sourceFiles(path)
		return /\.(js|ts|vue)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
	})

/** @param {string} file @param {string} text @returns {string[]} */
const findSnapshotRefs = (file, text) =>
	text
		.split('\n')
		.map((line, i) => ({ line, n: i + 1 }))
		.filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line) && STORE_SNAPSHOT_REF.test(line))
		.map(({ line, n }) => `${relative(ROOT, file)}:${n}: ${line.trim()}`)

describe('no ref(store.field) snapshots in src', { tags: ['@unit'] }, () => {
	it('matches the forms it bans and ignores the ones it does not (control)', () => {
		const banned = [
			'const showTrees = ref(toggleStore.showTrees)',
			'const view = ref(store.view)',
			'const idx = ref( propsStore.statsIndex )',
		]
		const allowed = [
			'const { showTrees } = storeToRefs(toggleStore)',
			'const containerRef = ref(null)',
			'const x = ref(props.initialValue)',
			'// ref(toggleStore.showTrees) was the old form',
		]
		expect(banned.flatMap((line) => findSnapshotRefs(SRC, line))).toHaveLength(banned.length)
		expect(allowed.flatMap((line) => findSnapshotRefs(SRC, line))).toEqual([])
	})

	it('finds none outside the allowlist', () => {
		const files = sourceFiles(SRC)
		expect(files.length).toBeGreaterThan(100)

		const hits = files.flatMap((file) => findSnapshotRefs(file, readFileSync(file, 'utf8')))
		const unexpected = hits.filter(
			(hit) => !Object.keys(ALLOWED).some((f) => hit.startsWith(`${f}:`))
		)
		expect(unexpected).toEqual([])

		// A stale allowlist entry would hide a future regression in that file.
		for (const file of Object.keys(ALLOWED)) {
			expect(
				hits.some((hit) => hit.startsWith(`${file}:`)),
				`${file} no longer needs an entry`
			).toBe(true)
		}
	})
})
