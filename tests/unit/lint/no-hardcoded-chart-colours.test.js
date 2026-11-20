/**
 * Static sweep: the charts that compare a selection with a reference take their
 * series colours from `src/constants/chartColors.js` instead of naming them (#1162).
 *
 * Before the shared module each chart named its own colours: the building heat
 * charts drew the selected building in orange and the postal-code average in
 * steelblue, while SocioEconomicsChart drew the current area in lightblue and the
 * comparison area in orange. A user who learned "orange = selected" read the
 * socioeconomics chart backwards. This test fails when a listed chart's script
 * contains any colour literal, so a role colour can only come from the shared
 * definition.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { babelParse, parse as parseSfc } from 'vue/compiler-sfc'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** The issue's "Where" sites: every chart that draws a selected or reference series. */
const SERIES_CHARTS = [
	'src/components/BuildingGridChart.vue',
	'src/components/BuildingHeatChart.vue',
	'src/components/HSYBuildingHeatChart.vue',
	'src/components/SocioEconomicsChart.vue',
]

/** CSS-wide keywords and non-colours that jsdom also accepts as `color` values. */
const NOT_A_ROLE_COLOUR = new Set(['inherit', 'initial', 'unset', 'revert', 'currentcolor'])

/**
 * True when `value` parses as a CSS colour (a keyword, hex or functional notation).
 * jsdom's CSSStyleDeclaration drops values it cannot parse, so this uses the same
 * parser a browser would instead of a hand-kept list of colour names.
 * @param {string} value
 */
const isCssColour = (value) => {
	const probe = document.createElement('i')
	probe.style.color = value.trim()
	return probe.style.color !== '' && !NOT_A_ROLE_COLOUR.has(value.trim().toLowerCase())
}

/** @param {string} file */
const scriptOf = (file) => {
	const { descriptor } = parseSfc(readFileSync(join(ROOT, file), 'utf8'), { filename: file })
	const script = descriptor.script ?? descriptor.scriptSetup
	if (!script) throw new Error(`${file} has no <script> block`)
	return script.content
}

/**
 * Every string in `code`: string literals and the text parts of template literals.
 * Parsed with Babel, so quotes inside comments and template literals cannot
 * misalign the scan.
 * @param {string} code
 * @returns {string[]}
 */
const stringLiterals = (code) => {
	const found = []
	const visit = (node) => {
		if (!node || typeof node.type !== 'string') return
		if (node.type === 'StringLiteral') found.push(node.value)
		if (node.type === 'TemplateElement') found.push(node.value.cooked ?? node.value.raw)
		for (const [key, value] of Object.entries(node)) {
			if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
			for (const child of Array.isArray(value) ? value : [value]) {
				if (child && typeof child === 'object') visit(child)
			}
		}
	}
	visit(babelParse(code, { sourceType: 'module', plugins: ['typescript'] }).program)
	return found
}

describe('chart series colours come from chartColors.js', { tags: ['@unit'] }, () => {
	it('the colour probe accepts colour literals and rejects other strings (control)', () => {
		for (const colour of ['orange', 'steelblue', 'lightblue', '#4682b4', 'rgb(70, 130, 180)']) {
			expect(isCssColour(colour), colour).toBe(true)
		}
		for (const other of ['focus', 'baseline', 'building', 'postalcode', 'bar', 'compact']) {
			expect(isCssColour(other), other).toBe(false)
		}
		// A quote inside a comment or template literal must not hide the literal after it.
		const dollar = '$'
		const tricky = [
			"// the chart's colours",
			`const t = \`it's ${dollar}{x} "quoted"\``,
			`a('orange', "steelblue", \`lightblue\`)`,
		].join('\n')
		expect(stringLiterals(tricky).filter(isCssColour)).toEqual(['orange', 'steelblue', 'lightblue'])
	})

	it('defines one colour per role, and the two roles differ', () => {
		expect(Object.keys(CHART_SERIES_COLORS).sort()).toEqual(['baseline', 'focus'])
		expect(Object.isFrozen(CHART_SERIES_COLORS)).toBe(true)
		expect(CHART_SERIES_COLORS.focus).not.toBe(CHART_SERIES_COLORS.baseline)
		for (const colour of Object.values(CHART_SERIES_COLORS)) {
			expect(isCssColour(colour), colour).toBe(true)
		}
	})

	it.each(SERIES_CHARTS)('%s names no colour of its own', (file) => {
		const script = scriptOf(file)
		const colours = stringLiterals(script).filter(isCssColour)
		expect(colours, `${file} hardcodes ${colours.join(', ')}`).toEqual([])
		expect(script).toMatch(
			/import\s*\{[^}]*\bCHART_SERIES_COLORS\b[^}]*\}\s*from\s*'[^']*constants\/chartColors(\.js)?'/
		)
	})
})
