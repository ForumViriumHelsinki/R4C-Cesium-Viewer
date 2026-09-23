/**
 * Test-suite contract: no substring class probes on Vuetify theme colours.
 *
 * A selector such as `[class*="error"]` matches Vuetify's colour utility
 * classes (`bg-error`, `text-error`), which the app puts on working UI. The
 * compass North button is coloured `error` whenever the heading is north
 * (src/components/CameraControls.vue getButtonColor), so an "expect 0 error
 * elements" probe built this way fails on a healthy page (#947). Error probes
 * must use the semantic selector in tests/e2e/helpers/error-states.ts instead.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const TESTS_DIR = join(ROOT, 'tests')
const SELF = relative(ROOT, new URL(import.meta.url).pathname)

// Files allowed to contain the probe, each with the reason.
const ALLOWED = {
	// Reproduces the old probe to show it counts the compass button.
	'tests/unit/testContracts/errorStateSelector.test.js': 'mutation control',
}

// Vuetify's theme colours: each becomes a `bg-<name>` / `text-<name>` /
// `border-<name>` utility class wherever a component takes `color="<name>"`.
const COLOUR_UTILITY_CLASSES = [
	'error',
	'warning',
	'success',
	'info',
	'primary',
	'secondary',
].flatMap((colour) => ['bg-', 'text-', 'border-'].map((prefix) => prefix + colour))

// `[class*=`, `[class^=`, `[class$=`, `[class|=`: every attribute operator that
// matches part of the class attribute. `[class~=` matches a whole token and is
// not covered. The value may be quoted, and the quote may be escaped.
const SUBSTRING_CLASS_PROBE = /\[class\s*[*^$|]=\s*\\?["']?([^\]"'\\]*)/g

/**
 * Whether a substring probe value also matches a colour utility class, as
 * `error` matches `bg-error`. Case-insensitive, so `Error` counts too.
 * @param {string} value
 */
function matchesColourUtility(value) {
	const needle = value.toLowerCase()
	return needle.length > 0 && COLOUR_UTILITY_CLASSES.some((cls) => cls.includes(needle))
}

/**
 * Substring class probes in a source text that match a colour utility class.
 * @param {string} text
 * @returns {{ line: number, probe: string }[]}
 */
function findColourProbes(text) {
	const hits = []
	for (const match of text.matchAll(SUBSTRING_CLASS_PROBE)) {
		if (!matchesColourUtility(match[1])) continue
		const line = text.slice(0, match.index).split('\n').length
		hits.push({ line, probe: match[0] })
	}
	return hits
}

function testSourceFiles() {
	return readdirSync(TESTS_DIR, { recursive: true })
		.map((entry) => join(TESTS_DIR, entry))
		.filter((file) => /\.(ts|js|mjs|cjs)$/.test(file))
		.map((file) => relative(ROOT, file))
		.filter((file) => file !== SELF && !(file in ALLOWED))
}

describe('test-suite contract: error probes', () => {
	const files = testSourceFiles()

	it('scans the test sources (guards against a vacuous pass)', () => {
		expect(files).toContain('tests/e2e/accessibility/building-filters.spec.ts')
		expect(files).not.toContain(SELF)
		// Control: the matcher flags the pattern it exists to catch, with its
		// quotes escaped or not, and ignores a non-colour substring probe.
		expect(findColourProbes('locator(\'[class*="error"], [class*="Error"]\')')).toHaveLength(2)
		expect(findColourProbes('"[class*=\\"text-warning\\"]"')).toHaveLength(1)
		expect(findColourProbes('querySelector(\'[class*="v-theme"]\')')).toHaveLength(0)
		expect(findColourProbes('locator(\'[class*="building-info"]\')')).toHaveLength(0)
	})

	it('no test selector matches a Vuetify theme colour by class substring', () => {
		const probes = files.flatMap((file) =>
			findColourProbes(readFileSync(join(ROOT, file), 'utf8')).map(
				({ line, probe }) => `${file}:${line} ${probe}`
			)
		)
		expect(probes).toEqual([])
	})
})
