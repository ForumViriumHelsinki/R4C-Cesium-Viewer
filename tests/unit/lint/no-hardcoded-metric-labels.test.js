/**
 * Static sweep: the components that show metric and building-attribute names read
 * them from `src/constants/metricLabels.js` instead of hardcoding them (#1154, #1156).
 *
 * Before the shared module, one Landsat value was "Landsat surface heat", "Heat
 * Exposure" and "Heat exposure index" in three places, and construction year was
 * "Year Built", "Built" and "age". Each copy drifted on its own. This test fails
 * when a listed file spells out a label the shared module defines, or brings back
 * one of the retired names.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	BUILDING_ATTRIBUTE_LABELS,
	INDEX_LABELS,
	METRIC_LABELS,
	PROPERTY_LABELS,
	SOCIOECONOMIC_HEAT_INDICATORS,
	SOCIOECONOMIC_INDICATORS,
} from '@/constants/metricLabels.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Every file that shows a metric or building-attribute name (the issues' "Where" sites). */
const LABEL_SITES = [
	'src/components/AreaProperties.vue',
	'src/components/BuildingHeatChart.vue',
	'src/components/CategoricalSelect.vue',
	'src/components/EstimatedImpacts.vue',
	'src/components/HSYBuildingHeatChart.vue',
	'src/components/HSYScatterplot.vue',
	'src/components/HeatHistogram.vue',
	'src/components/LandcoverToParks.vue',
	'src/components/NumericalSelect.vue',
	'src/components/Scatterplot.vue',
	'src/components/SocioEconomicsChart.vue',
	'src/components/StatisticalGridOptions.vue',
	'src/composables/useIndexData.js',
	'src/stores/propsStore.js',
	'src/utils/gridColorMapping.js',
]

/** Names these sites used before #1154/#1156. None of them may come back. */
const RETIRED_NAMES = [
	'Heat Index',
	'Flood Index',
	'Green Space Index',
	'Landsat surface heat',
	'Combined Landsat surface heat',
	'Heat and Landsat surface heat combined',
	'Heat exposure index',
	'Combined Heat Exposure',
	'Temperature',
	'Temperature in Celsius',
	'Temperature Comparison',
	'Temperature in Celsius Comparison',
	'Apartment Heat Exposure',
	'Apartment Surface Heat',
	'Apartment Cold Exposure',
	'Children and Elderly %',
	'Basic Education',
	'Year Built',
	'Built',
	'Floor Count',
	'Usage',
	'Material',
]

const DEFINED_LABELS = [
	...new Set([
		...Object.values(METRIC_LABELS),
		...Object.values(INDEX_LABELS),
		...Object.values(BUILDING_ATTRIBUTE_LABELS),
		...Object.values(PROPERTY_LABELS),
		...Object.values(SOCIOECONOMIC_HEAT_INDICATORS).map(({ label }) => label),
		...SOCIOECONOMIC_INDICATORS.map(({ label }) => label),
	]),
]

/** @param {string} text */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Where a hardcoded label shows up: as a whole string literal (`'Floors'`), as
 * template text (`<h5>Heat Index</h5>`), or as the name in a `name: value` tooltip
 * or a row or sentence about the metric (`` `Heat exposure index: ${x}` ``,
 * `<td>Heat Index Reduction`, `Total Heat Vulnerability impact`).
 *
 * Each label is matched as written and in Title Case, so `'Heat Vulnerability'`
 * counts as the defined `Heat vulnerability`. Lower case is not matched: `'tenure'`
 * is the data key the `Tenure` label names, and `'postal code'` is a noun in a
 * sentence, not the `Postal code` field label.
 * @param {string} label
 */
const labelPatterns = (label) => {
	const titleCase = label.replace(/\b[a-z]/g, (c) => c.toUpperCase())
	const l = `(?:${escapeRegExp(label)}|${escapeRegExp(titleCase)})`
	return [
		new RegExp(`(['"\`])${l}\\1`),
		new RegExp(`>\\s*${l}\\s*<`),
		new RegExp(
			`(['"\`>]|<br>)[^'"\`<>{}\\n]*?\\b${l}(?=\\s*:|\\s+(?:[Rr]eduction|[Ss]hown|[Ww]ith|[Cc]omparison|[Ii]mpact)\\b)`
		),
	]
}

/** An option or chip label written as a literal instead of read from the module. */
const LITERAL_OPTION_LABEL = /\b(?:text|title|label):\s*['"`]/

/** Strip comments so a label named in documentation does not count. @param {string} text */
const stripComments = (text) =>
	text
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.split('\n')
		.filter((line) => !/^\s*\/\//.test(line))
		.join('\n')

/**
 * @param {string} name label site, for the report
 * @param {string} text file source
 * @param {string[]} labels
 * @returns {string[]} `site: "label"` for each hardcoded label
 */
const findHardcoded = (name, text, labels) => {
	const code = stripComments(text)
	return labels
		.filter((label) => labelPatterns(label).some((pattern) => pattern.test(code)))
		.map((label) => `${name}: "${label}"`)
}

describe('metric and attribute labels come from the shared module', { tags: ['@unit'] }, () => {
	it('detects each hardcoded form and ignores constants and comments (control)', () => {
		const hardcoded = [
			"{ text: 'Floors', value: 'kerrosten_lkm' }",
			'<h5>Heat vulnerability</h5>',
			// biome-ignore lint/suspicious/noTemplateCurlyInString: source text of a template literal, matched literally
			'`Surface heat index (Landsat): ${d.x0}`',
			'<td>Surface heat index (Landsat) reduction (This Turn)</td>',
			'<td>Surface Heat Index (Landsat) Reduction (This Turn)</td>',
			"plotService.addTitle(svg, 'Heat Vulnerability', 0, 0)",
			'<p>Total Heat Vulnerability impact: {{ impact }}</p>',
		]
		for (const line of hardcoded) {
			expect(findHardcoded('fixture', line, DEFINED_LABELS), line).not.toEqual([])
		}
		const allowed = [
			"{ text: propertyLabel('kerrosten_lkm'), value: 'kerrosten_lkm' }",
			'<h5>{{ METRIC_LABELS.HEAT_VULNERABILITY }}</h5>',
			"// 'Floors' used to be hardcoded here",
			'<!-- <h5>Heat vulnerability</h5> -->',
		]
		expect(allowed.flatMap((line) => findHardcoded('fixture', line, DEFINED_LABELS))).toEqual([])
		// A one-word label's data key is not a hardcoded label.
		expect(findHardcoded('fixture', "{ value: 'tenure' }", DEFINED_LABELS)).toEqual([])
		expect(LITERAL_OPTION_LABEL.test("{ title: 'age', value: 'c_valmpvm' }")).toBe(true)
		expect(LITERAL_OPTION_LABEL.test('{ title: BUILDING_ATTRIBUTE_LABELS.AGE }')).toBe(false)
	})

	it('has labels to look for', () => {
		expect(DEFINED_LABELS.length).toBeGreaterThan(30)
		expect(DEFINED_LABELS).toContain('Year built')
	})

	it.each(LABEL_SITES)('%s hardcodes no label the shared module defines', (site) => {
		const text = readFileSync(join(ROOT, site), 'utf8')
		expect(findHardcoded(site, text, DEFINED_LABELS)).toEqual([])
	})

	it.each(LABEL_SITES)('%s writes no option or chip label as a literal', (site) => {
		const lines = stripComments(readFileSync(join(ROOT, site), 'utf8')).split('\n')
		const literal = lines.filter((line) => LITERAL_OPTION_LABEL.test(line))
		expect(literal.map((line) => line.trim())).toEqual([])
	})

	it.each(LABEL_SITES)('%s uses none of the retired names', (site) => {
		const text = readFileSync(join(ROOT, site), 'utf8')
		expect(findHardcoded(site, text, RETIRED_NAMES)).toEqual([])
	})
})
