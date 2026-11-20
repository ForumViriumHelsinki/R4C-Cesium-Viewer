/**
 * Every surface that names the land cover or NDVI layer to the user uses the name
 * the layer switch carries (#1155).
 *
 * LayerSwitch and the Analysis registry read LAYER_LABELS. The loading indicator
 * ("NDVI Data") and the layer-conflict warning ("NDVI and Land Cover cannot be
 * active simultaneously") had their own copies, so they named NDVI differently from
 * the switch the user had just turned on. #1155 also drops "land use" for the HSY
 * land cover layer.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LayerConflictAlert from '@/components/controls/LayerConflictAlert.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
import { LAYER_LABELS } from '@/constants/metricLabels.js'
import { useLoadingStore } from '@/stores/loadingStore.js'

const vuetify = createVuetify({ components, directives })

describe('layer names outside the layer switch (#1155)', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('no source file calls the HSY land cover layer "land use"', () => {
		const srcDir = join(process.cwd(), 'src')
		const offenders = readdirSync(srcDir, { recursive: true })
			.map(String)
			.filter((file) => /\.(js|ts|vue)$/.test(file))
			.filter((file) => /land use/i.test(readFileSync(join(srcDir, file), 'utf8')))

		expect(offenders).toEqual([])
	})

	// The journey docs cite the E2E locators and ADR-009 lists the current registry
	// entries by label, so a renamed label leaves them describing controls that no
	// longer exist. Other ADRs are dated records (ADR-010 lists facts "checked at
	// a3c3269") and may quote an old label, so they are not checked.
	// "NDVI Vegetation Index" is the feature flag's name, not the layer's.
	const OLD_NDVI_LABEL = /NDVI Vegetation(?! Index)/
	const usesOldLabel = (path) =>
		OLD_NDVI_LABEL.test(readFileSync(join(process.cwd(), path), 'utf8'))

	it('docs/blueprint/user-journeys uses the current NDVI label', () => {
		const dir = 'docs/blueprint/user-journeys'
		const offenders = readdirSync(join(process.cwd(), dir))
			.filter((file) => file.endsWith('.md'))
			.filter((file) => usesOldLabel(join(dir, file)))

		expect(offenders).toEqual([])
	})

	it('ADR-009 lists the registry entries by their current NDVI label', () => {
		expect(usesOldLabel('docs/adr/ADR-009-analysis-registry.md')).toBe(false)
	})

	it('the conflict warning names both layers as their switches do', () => {
		const wrapper = mount(LayerConflictAlert, {
			props: { hasConflict: true },
			global: { plugins: [vuetify] },
		})

		const text = wrapper.text()
		expect(text).toContain(LAYER_LABELS.NDVI)
		expect(text).toContain(LAYER_LABELS.LAND_COVER)
	})

	it.each([
		['ndvi', LAYER_LABELS.NDVI],
		['landcover', LAYER_LABELS.LAND_COVER],
	])('the loading indicator names the %s layer "%s"', async (layer, label) => {
		const loadingStore = useLoadingStore()
		loadingStore.layerLoading[layer] = true

		// jsdom has no visualViewport, which Vuetify's overlay positioning reads, so
		// the snackbar renders its content in place.
		const wrapper = mount(LoadingIndicator, {
			props: { mode: 'compact' },
			global: {
				plugins: [vuetify],
				stubs: { VSnackbar: { template: '<div class="snackbar-stub"><slot /></div>' } },
			},
		})

		expect(wrapper.find('.snackbar-stub').text()).toContain(`Loading ${label}...`)
	})
})
