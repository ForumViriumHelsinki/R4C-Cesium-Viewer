/**
 * Sweep: who writes `scene.requestRenderMode` (#1018).
 *
 * graphicsStore.requestRenderMode (default true, set from the
 * r4c-request-render-mode flag) is the one setting for Cesium's render mode.
 * The tab-visibility handler used to write a literal `false` to the scene on
 * tab return, which turned continuous rendering on for the rest of the session
 * regardless of the store. This sweep reads every source file and checks each
 * assignment to a scene's requestRenderMode:
 *
 * - it is in a file on the allowlist (the graphics service and the viewer
 *   composable), and
 * - its right-hand side is either the literal `true` (pausing is always safe)
 *   or an expression that reads graphicsStore.requestRenderMode.
 *
 * A literal `false`, or any value that does not come from the store, fails.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = 'src'
const SOURCE_EXT = /\.(js|ts|vue)$/

/** Files allowed to write the live scene's requestRenderMode. */
const ALLOWED_FILES = ['src/composables/useViewerInitialization.js', 'src/services/graphics.js']

/** `<something>scene.requestRenderMode = <rhs>`, excluding `==`/`===` comparisons. */
const SCENE_WRITE = /([\w$.]*scene)\.requestRenderMode\s*=(?!=)\s*([^;\n]+)/g

/**
 * @returns {{ file: string, line: number, target: string, rhs: string }[]}
 */
function findSceneWrites() {
	const writes = []
	const files = /** @type {string[]} */ (readdirSync(SRC_DIR, { recursive: true }))
		.filter((f) => SOURCE_EXT.test(f))
		.map((f) => join(SRC_DIR, f).split('\\').join('/'))
	for (const file of files) {
		const lines = readFileSync(file, 'utf8').split('\n')
		lines.forEach((text, index) => {
			if (/^\s*(\/\/|\*)/.test(text)) return // comments and JSDoc
			for (const match of text.matchAll(SCENE_WRITE)) {
				writes.push({ file, line: index + 1, target: match[1], rhs: match[2].trim() })
			}
		})
	}
	return writes
}

/** @param {string} rhs */
const isAllowedValue = (rhs) => rhs === 'true' || /graphicsStore\.requestRenderMode\b/.test(rhs)

describe('scene.requestRenderMode writers', () => {
	const writes = findSceneWrites()

	it('finds the known writers (guards against a vacuous pass)', () => {
		// The graphics service applies the store to the scene; the visibility
		// handler pauses rendering while the tab is hidden.
		expect(writes.some((w) => w.file === 'src/services/graphics.js')).toBe(true)
		expect(
			writes.some(
				(w) => w.file === 'src/composables/useViewerInitialization.js' && w.rhs === 'true'
			)
		).toBe(true)
	})

	it('only the graphics service and the viewer composable write the scene flag', () => {
		const outside = writes
			.filter((w) => !ALLOWED_FILES.includes(w.file))
			.map((w) => `${w.file}:${w.line} ${w.target}.requestRenderMode = ${w.rhs}`)
		expect(outside).toEqual([])
	})

	it('every write is `true` or reads graphicsStore.requestRenderMode', () => {
		const offending = writes
			.filter((w) => !isAllowedValue(w.rhs))
			.map((w) => `${w.file}:${w.line} ${w.target}.requestRenderMode = ${w.rhs}`)
		expect(offending).toEqual([])
	})
})
