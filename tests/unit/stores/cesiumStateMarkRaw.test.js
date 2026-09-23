/**
 * Sweep: Cesium objects enter Pinia state only through markRaw (#1019).
 *
 * Pinia state is deeply reactive. A Cesium ImageryLayer or DataSource written
 * into it as-is comes back as a reactive proxy, and Cesium's collections match
 * by identity (ImageryLayerCollection.contains()/remove() and
 * DataSourceCollection run indexOf), so the object can never be found again.
 * floodwms.js did this with the flood layer (#1019), landcover.js with the
 * land-cover layer (#967, fixed by #1016).
 *
 * Which store fields hold Cesium objects is read from src/main.js: Sentry's
 * Pinia stateTransformer already strips exactly those fields, because Cesium
 * objects cannot be serialized. Every write to one of those fields anywhere in
 * src/ (assignment, or push/unshift/splice) must pass the value through
 * markRaw (or the store's markRawEach helper), or reset it to [] / null.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = 'src'
const SOURCE_EXT = /\.(js|ts|vue)$/

/**
 * Known violations owned by another open change. Keyed `file|field`; delete the
 * entry when that change lands.
 */
const PENDING = new Set([
	// #1016 wraps the land-cover push in markRaw.
	'src/services/landcover.js|landcoverLayers',
])

/**
 * Store fields holding Cesium objects: the keys each branch of Sentry's
 * stateTransformer destructures out of `state` in src/main.js.
 * @returns {string[]}
 */
function cesiumStateFields() {
	const main = readFileSync('src/main.js', 'utf8')
	const fields = []
	for (const block of main.matchAll(/store\.\$id === '\w+'\)\s*\{\s*const \{([^}]*)\} = state/g)) {
		for (const key of block[1].matchAll(/(\w+):\s*_\w+/g)) fields.push(key[1])
	}
	return fields
}

/** Drop block comments and whole-line `//` comments, keeping line numbers. */
function stripComments(text) {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
		.replace(/^[ \t]*\/\/.*$/gm, '')
}

/** @param {string} value */
const isRawOrReset = (value) =>
	/\bmarkRaw(Each)?\(/.test(value) || /^(\[\]|null|undefined)$/.test(value.trim())

/**
 * @param {string[]} fields
 * @returns {{ file: string, line: number, field: string, value: string }[]}
 */
function findWrites(fields) {
	const files = /** @type {string[]} */ (readdirSync(SRC_DIR, { recursive: true }))
		.filter((f) => SOURCE_EXT.test(f))
		.map((f) => join(SRC_DIR, f).split('\\').join('/'))
	const names = fields.join('|')
	const assignment = new RegExp(`\\.(${names})\\s*=(?!=)\\s*([^;\\n]*)`, 'g')
	const mutation = new RegExp(
		`\\.(${names})\\.(?:push|unshift|splice)\\(([\\s\\S]*?)\\)\\s*(?:;|\\n)`,
		'g'
	)

	const writes = []
	for (const file of files) {
		const text = stripComments(readFileSync(file, 'utf8'))
		for (const re of [assignment, mutation]) {
			for (const match of text.matchAll(re)) {
				const line = text.slice(0, match.index).split('\n').length
				writes.push({ file, line, field: match[1], value: match[2].trim() })
			}
		}
	}
	return writes
}

describe('Cesium objects in Pinia state', () => {
	const fields = cesiumStateFields()
	const writes = findWrites(fields)

	it('reads the Cesium-holding store fields from main.js (guards against a vacuous pass)', () => {
		for (const known of ['floodLayers', 'landcoverLayers', 'cesiumViewer', 'postalCodeData']) {
			expect(fields).toContain(known)
		}
	})

	it('finds the known writers (guards against a regex that matches nothing)', () => {
		expect(
			writes.some((w) => w.file === 'src/services/floodwms.js' && w.field === 'floodLayers')
		).toBe(true)
		expect(
			writes.some((w) => w.file === 'src/stores/globalStore.js' && w.field === 'cesiumViewer')
		).toBe(true)
	})

	it('every write passes the Cesium object through markRaw', () => {
		const offending = writes
			.filter((w) => !isRawOrReset(w.value) && !PENDING.has(`${w.file}|${w.field}`))
			.map((w) => `${w.file}:${w.line} ${w.field} <- ${w.value}`)
		expect(offending).toEqual([])
	})

	it('has no stale PENDING entries (delete an entry once its fix lands)', () => {
		// A stale entry would silently allowlist a later regression at that site.
		const unmarked = new Set(
			writes.filter((w) => !isRawOrReset(w.value)).map((w) => `${w.file}|${w.field}`)
		)
		expect([...PENDING].filter((entry) => !unmarked.has(entry))).toEqual([])
	})
})
