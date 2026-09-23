/**
 * The Flood Risk category of BackgroundMapBrowser must offer every scenario
 * SYKE publishes, with its legend and the Syke CC BY 4.0 attribution.
 *
 * #159 copied the flood selector out of FloodBackgroundSyke instead of moving
 * it, and the copy dropped the three 2100 coastal scenarios, the "Sea area"
 * legend entry and the attribution (#982). SYKE_SCENARIOS is the oracle,
 * written out here rather than read from src/constants/floodScenarios.js so
 * that dropping an id from the constants fails this test.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import BackgroundMapBrowser from '@/components/BackgroundMapBrowser.vue'
import { createFloodImageryLayer } from '@/services/floodwms'
import { useURLStore } from '@/stores/urlStore'

// SYKE WMS GetCapabilities, checked 2026-09-23: tulva/ows (stormwater),
// meritulvakartat_2022_yhdistelma (combined), meritulvakartat_2022 (coastal)
const SYKE_SCENARIOS = [
	'HulevesitulvaVesisyvyysSade52mmMallinnettuAlue',
	'HulevesitulvaVesisyvyysSade80mmMallinnettuAlue',
	'SSP585_re_with_SSP245_with_SSP126_with_current',
	'coastal_flood_SSP126_2050_0020_with_protected',
	'coastal_flood_SSP245_2050_0020_with_protected',
	'coastal_flood_SSP585_2050_0020_with_protected',
	'coastal_flood_SSP126_2100_0020_with_protected',
	'coastal_flood_SSP245_2100_0020_with_protected',
	'coastal_flood_SSP585_2100_0020_with_protected',
]

vi.mock('@/services/floodwms', () => ({
	createFloodImageryLayer: vi.fn().mockResolvedValue(undefined),
	removeFloodLayers: vi.fn(),
}))

vi.mock('@/services/cesiumProvider', () => ({ getCesium: vi.fn(() => ({})) }))

vi.mock('@/stores/featureFlagStore', () => ({
	useFeatureFlagStore: () => ({ isEnabled: (flag) => flag === 'floodLayers' }),
}))

const mountFloodCategory = async () => {
	const wrapper = mount(BackgroundMapBrowser, {
		global: { plugins: [createVuetify({ components, directives })] },
	})
	const floodChip = wrapper.findAll('.v-chip').find((c) => c.text().includes('Flood Risk'))
	await floodChip.trigger('click')
	await flushPromises()
	return wrapper
}

const buttons = (wrapper) => wrapper.findAll('.flood-categories button')
const isYear = (b) => /^\d{4}$/.test(b.text().trim())
const scenarioButtons = (wrapper) =>
	buttons(wrapper).filter((b) => !isYear(b) && b.text().trim() !== 'None')
const loadedLayers = () => vi.mocked(createFloodImageryLayer).mock.calls.map((c) => c[1])

/** Clicks every scenario button, once per year option when a year selector exists. */
const selectEveryScenario = async (wrapper) => {
	const years = buttons(wrapper).filter(isYear)
	for (const year of years.length > 0 ? years : [null]) {
		if (year) {
			await year.trigger('click')
			await flushPromises()
		}
		for (const button of scenarioButtons(wrapper)) {
			await button.trigger('click')
			await flushPromises()
		}
	}
}

describe('BackgroundMapBrowser flood scenarios', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.mocked(createFloodImageryLayer).mockClear()
		// loadHSYLayers runs on mount; the environmental list is not under test
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, headers: new Headers() })
	})

	it('offers every SYKE scenario and loads each one through sykeFloodUrl', async () => {
		const wrapper = await mountFloodCategory()
		expect(scenarioButtons(wrapper).length).toBeGreaterThan(0)

		await selectEveryScenario(wrapper)

		expect([...new Set(loadedLayers())].sort()).toEqual([...SYKE_SCENARIOS].sort())
		const urlStore = useURLStore()
		for (const [url, layerName] of vi.mocked(createFloodImageryLayer).mock.calls) {
			expect(url, layerName).toBe(urlStore.sykeFloodUrl(layerName))
			expect(url, layerName).toMatch(/^https:\/\/paikkatiedot\.ymparisto\.fi\/geoserver\//)
		}
	})

	it('shows the Syke CC BY 4.0 attribution with any selected flood layer', async () => {
		const wrapper = await mountFloodCategory()
		expect(wrapper.find('a[href="https://www.syke.fi/en"]').exists()).toBe(false)

		for (const button of scenarioButtons(wrapper)) {
			await button.trigger('click')
			await flushPromises()
			const syke = wrapper.find('a[href="https://www.syke.fi/en"]')
			expect(syke.exists(), button.text()).toBe(true)
			expect(wrapper.find('.flood-attribution').text()).toContain('CC BY 4.0')
		}
	})

	it('lists the sea area in the coastal legend', async () => {
		const wrapper = await mountFloodCategory()
		const coastal = scenarioButtons(wrapper).find((b) => /SSP126/.test(b.text()))
		await coastal.trigger('click')
		await flushPromises()

		expect(loadedLayers().at(-1)).toMatch(/^coastal_flood_SSP126_/)
		expect(wrapper.find('.flood-legend').text()).toContain('Sea area')
	})

	it('keeps the selected pathway when the coastal year changes', async () => {
		const wrapper = await mountFloodCategory()
		const year = (y) => buttons(wrapper).find((b) => b.text().trim() === y)
		expect(year('2100')?.exists()).toBe(true)

		await year('2050').trigger('click')
		await flushPromises()
		await scenarioButtons(wrapper)
			.find((b) => b.text().trim() === 'SSP245')
			.trigger('click')
		await flushPromises()
		await year('2100').trigger('click')
		await flushPromises()

		expect(loadedLayers().at(-2)).toBe('coastal_flood_SSP245_2050_0020_with_protected')
		expect(loadedLayers().at(-1)).toBe('coastal_flood_SSP245_2100_0020_with_protected')
	})
})
