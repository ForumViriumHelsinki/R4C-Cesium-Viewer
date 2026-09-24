/**
 * Static sweep: no `void <call>(` in src/ (.claude/rules/code-quality.md, "Never Use
 * void Operator").
 *
 * `void somethingAsync()` silences biome's noFloatingPromises warning but drops the
 * promise, so a rejection becomes an unhandled rejection with no context. That is how
 * the pre-init getCesium() throws of #951 escaped from sidebar handlers. Handle the
 * promise instead: `.catch((error) => logger.error('…', error))`, or drop `void` when
 * the callee is synchronous.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROOT, 'src')

/** `void foo(`, `void this.foo(`, `void a.b.c(` — a discarded call result. */
const VOID_CALL = /\bvoid\s+[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\(/

/** @param {string} dir @returns {string[]} */
const sourceFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return sourceFiles(path)
		return /\.(js|ts|vue)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
	})

/** @param {string} line */
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line)

/** @param {string} text @returns {string[]} `file:line: code` for each void call */
const findVoidCalls = (file, text) =>
	text
		.split('\n')
		.map((line, i) => ({ line, n: i + 1 }))
		.filter(({ line }) => !isComment(line) && VOID_CALL.test(line))
		.map(({ line, n }) => `${relative(ROOT, file)}:${n}: ${line.trim()}`)

describe('no `void <call>(` in src', { tags: ['@unit'] }, () => {
	it('matches the forms it bans and ignores the ones it does not (control)', () => {
		const banned = [
			'void createHSYImageryLayer()',
			'\t\tvoid this.loadHelsinkiGreenElements()',
			'void dataSourceService.changeDataSourceShowByName("x", true)',
			'void nextTick(() => {',
			'const f = () => void refreshAll()',
		]
		const allowed = [
			'void counts // documented',
			'@returns {void}',
			'): Promise<void> {',
			'// void createHSYImageryLayer() used to live here',
		]
		expect(banned.flatMap((line) => findVoidCalls(SRC, line))).toHaveLength(banned.length)
		expect(allowed.flatMap((line) => findVoidCalls(SRC, line))).toEqual([])
	})

	it('finds none', () => {
		const files = sourceFiles(SRC)
		expect(files.length).toBeGreaterThan(100)

		const hits = files.flatMap((file) => findVoidCalls(file, readFileSync(file, 'utf8')))
		expect(hits).toEqual([])
	})
})
