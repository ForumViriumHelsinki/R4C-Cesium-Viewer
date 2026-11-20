import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AreaProperties from '../../../src/components/AreaProperties.vue'
import { propertyLabel } from '../../../src/constants/metricLabels.js'
import { useGlobalStore } from '../../../src/stores/globalStore.js'

/**
 * A stand-in for a picked Cesium entity: `properties.propertyNames` plus a
 * `getValue()` per key, which is all AreaProperties reads.
 */
const makeEntity = (values) => {
	const properties = { propertyNames: Object.keys(values) }
	for (const [key, value] of Object.entries(values)) {
		properties[key] = { getValue: () => value }
	}
	return { _id: 'building-1', properties }
}

const mountWithEntity = async (values) => {
	const pinia = createPinia()
	setActivePinia(pinia)
	const globalStore = useGlobalStore()
	globalStore.setPickedEntity(makeEntity(values))

	const wrapper = mount(AreaProperties, {
		global: {
			plugins: [pinia, createVuetify({ components, directives })],
		},
		attachTo: document.body,
	})
	await flushPromises()

	// Panel bodies render only once opened.
	for (const title of wrapper.findAll('.v-expansion-panel-title')) {
		await title.trigger('click')
	}
	await flushPromises()
	return wrapper
}

describe('AreaProperties Details names', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	it('names rows and summary chips from the shared label map (#1156)', async () => {
		const wrapper = await mountWithEntity({
			kavu: 1965,
			kerrosten_lkm: 4,
			avgheatexposuretobuilding: 0.42,
		})

		const rowNames = wrapper.findAll('.property-key').map((node) => node.text())
		expect(rowNames).toContain(propertyLabel('kavu'))
		expect(rowNames).toContain(propertyLabel('kerrosten_lkm'))
		expect(rowNames).not.toContain('Kavu')
		expect(rowNames).not.toContain('Kerrosten Lkm')

		// avgheatexposuretobuilding is a key property: shown as a chip, not a row.
		const chipNames = wrapper.findAll('.chip-label').map((node) => node.text())
		expect(chipNames).toContain(`${propertyLabel('avgheatexposuretobuilding')}:`)

		wrapper.unmount()
	})
})
