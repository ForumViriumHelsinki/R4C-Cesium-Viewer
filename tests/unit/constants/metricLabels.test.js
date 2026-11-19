/**
 * The shared display names for metrics and building attributes (#1154, #1156).
 *
 * One name per metric and per attribute, and no name shared by two different
 * metrics. `tests/unit/lint/no-hardcoded-metric-labels.test.js` checks that the
 * components showing these names read them from this module.
 */

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoricalSelect from '@/components/CategoricalSelect.vue'
import NumericalSelect from '@/components/NumericalSelect.vue'
import { useIndexData } from '@/composables/useIndexData.js'
import {
	BUILDING_ATTRIBUTE_LABELS,
	INDEX_LABELS,
	inSentence,
	METRIC_LABELS,
	PROPERTY_LABELS,
	propertyLabel,
	SOCIOECONOMIC_HEAT_INDICATORS,
	SOCIOECONOMIC_INDICATORS,
} from '@/constants/metricLabels.js'

vi.mock('@/services/eventEmitter.js', () => ({
	eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

/** @param {string[]} values */
const duplicates = (values) => values.filter((value, i) => values.indexOf(value) !== i)

describe('metric labels', { tags: ['@unit'] }, () => {
	it('uses the names the #1154 convention fixes', () => {
		expect(METRIC_LABELS.HEAT_VULNERABILITY).toBe('Heat vulnerability')
		expect(METRIC_LABELS.FLOOD_VULNERABILITY).toBe('Flood vulnerability')
		expect(METRIC_LABELS.SURFACE_HEAT_INDEX).toBe('Surface heat index (Landsat)')
		expect(METRIC_LABELS.SURFACE_TEMPERATURE).toBe('Surface temperature (°C)')
		expect(METRIC_LABELS.HEAT_EXPOSURE).toBe('Heat exposure')
	})

	it('gives no two metrics the same name', () => {
		expect(duplicates(Object.values(METRIC_LABELS))).toEqual([])
		expect(duplicates(Object.values(INDEX_LABELS))).toEqual([])
	})

	it('names each grid index after its metric', () => {
		expect(INDEX_LABELS.heat_index).toBe(METRIC_LABELS.HEAT_VULNERABILITY)
		expect(INDEX_LABELS.flood_index).toBe(METRIC_LABELS.FLOOD_VULNERABILITY)
		expect(INDEX_LABELS.heat_exposure).toBe(METRIC_LABELS.HEAT_EXPOSURE)
		expect(INDEX_LABELS.avgheatexposure).toBe(METRIC_LABELS.SURFACE_HEAT_INDEX)
		expect(INDEX_LABELS.green).toBe(METRIC_LABELS.GREEN_SPACE)
	})

	it('keeps "Heat exposure" for the social-vulnerability component only', () => {
		const heatExposureKeys = Object.entries({ ...INDEX_LABELS, ...PROPERTY_LABELS })
			.filter(([, label]) => label === METRIC_LABELS.HEAT_EXPOSURE)
			.map(([key]) => key)
		expect(heatExposureKeys).toEqual(['heat_exposure'])
	})

	it('labels the Landsat building value and °C value as their metrics in Details', () => {
		expect(propertyLabel('avgheatexposuretobuilding')).toBe(METRIC_LABELS.SURFACE_HEAT_INDEX)
		expect(propertyLabel('averageheatexposure')).toBe(METRIC_LABELS.SURFACE_HEAT_INDEX)
		expect(propertyLabel('avg_temp_c')).toBe(METRIC_LABELS.SURFACE_TEMPERATURE)
	})
})

describe('grid index options', { tags: ['@unit'] }, () => {
	it('take every option text from INDEX_LABELS, and every label has an option', () => {
		const { indexOptions } = useIndexData()
		for (const option of indexOptions.value) {
			expect(option.text, option.value).toBe(INDEX_LABELS[option.value])
		}
		expect(indexOptions.value.map((option) => option.value).sort()).toEqual(
			Object.keys(INDEX_LABELS).sort()
		)
	})
})

describe('building attribute labels', { tags: ['@unit'] }, () => {
	it('gives the same attribute one name across the HSY, Helsinki and Details keys', () => {
		const sameAttribute = [
			['kavu', 'year_of_construction'],
			['kerrosten_lkm', 'i_kerrlkm'],
			['rakennusaine_s', 'c_rakeaine'],
			['kayttotarkoitus', 'kayttarks'],
			['julkisivu_s', 'c_julkisivu'],
			['lammitystapa_s', 'c_lammtapa'],
			['lammitysaine_s', 'c_poltaine'],
		]
		for (const [first, second] of sameAttribute) {
			expect(propertyLabel(first), first).toBeTruthy()
			expect(propertyLabel(second), `${second} vs ${first}`).toBe(propertyLabel(first))
		}
		expect(propertyLabel('kavu')).toBe(BUILDING_ATTRIBUTE_LABELS.YEAR_BUILT)
		expect(propertyLabel('kayttotarkoitus')).toBe(BUILDING_ATTRIBUTE_LABELS.BUILDING_USE)
		expect(propertyLabel('rakennusaine_s')).toBe(BUILDING_ATTRIBUTE_LABELS.BUILDING_MATERIAL)
		expect(propertyLabel('kerrosten_lkm')).toBe(BUILDING_ATTRIBUTE_LABELS.FLOORS)
	})

	it('gives no two attributes the same name', () => {
		expect(duplicates(Object.values(BUILDING_ATTRIBUTE_LABELS))).toEqual([])
	})

	it('returns undefined for a key it does not know, so callers can fall back', () => {
		expect(propertyLabel('no_such_key')).toBeUndefined()
	})
})

describe('HSY scatter-plot selects', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	/** @param {any} component */
	const optionsOf = (component, field) =>
		mount(component, { global: { stubs: { 'v-select': true } } }).vm[field]

	it.each([
		['NumericalSelect', NumericalSelect, 'numericalOptions'],
		['CategoricalSelect', CategoricalSelect, 'categoricalOptions'],
	])('%s labels each option with its Details name', (_name, component, field) => {
		const options = optionsOf(component, field)
		expect(options.length).toBeGreaterThan(0)
		for (const option of options) {
			expect(option.text, option.value).toBe(PROPERTY_LABELS[option.value])
		}
	})
})

describe('socioeconomic indicators', { tags: ['@unit'] }, () => {
	it('pair every bar label with a description', () => {
		const all = [...Object.values(SOCIOECONOMIC_HEAT_INDICATORS), ...SOCIOECONOMIC_INDICATORS]
		for (const { label, description } of all) {
			expect(label).toBeTruthy()
			expect(description, label).toBeTruthy()
		}
		expect(duplicates(all.map(({ label }) => label))).toEqual([])
	})

	it('put the age bands in the children and elderly labels', () => {
		const labels = SOCIOECONOMIC_INDICATORS.map(({ label }) => label)
		expect(labels).toContain('Children (0-12) %')
		expect(labels).toContain('Elderly (65+) %')
		expect(labels).toContain('Children and elderly (0-12, 65+) %')
	})

	it('name the heat bar after the Landsat metric, not "heat exposure"', () => {
		expect(SOCIOECONOMIC_HEAT_INDICATORS.surfaceHeat.label).toBe(METRIC_LABELS.SURFACE_HEAT_INDEX)
	})
})

describe('inSentence', { tags: ['@unit'] }, () => {
	it('lower-cases the first letter of a label for use mid-sentence', () => {
		expect(inSentence('Heat vulnerability')).toBe('heat vulnerability')
		expect(inSentence('Surface heat index (Landsat)')).toBe('surface heat index (Landsat)')
	})

	it('leaves a leading acronym alone', () => {
		expect(inSentence('NDVI')).toBe('NDVI')
		expect(inSentence('ID number')).toBe('ID number')
	})
})
