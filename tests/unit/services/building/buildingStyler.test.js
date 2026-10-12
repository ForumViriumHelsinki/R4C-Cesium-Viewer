import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingStyler, filterHeatTimeseries } from '@/services/building/buildingStyler.js'
import { usePropsStore } from '@/stores/propsStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

// Real Cesium entity (tests/setup.js mocks `cesium` globally): the click handler
// hands createBuildingCharts the entity's live PropertyBag.
const { Entity } = await vi.importActual('cesium')

const HEAT_TIMESERIES = [
	{ date: '2015-07-03', avgheatexposure: 0.4 },
	{ date: '2020-06-26', avgheatexposure: 0.6 },
	{ date: '2024-06-26', avgheatexposure: 0.7 },
]

describe('filterHeatTimeseries', () => {
	it('drops entries from before the construction year', () => {
		expect(filterHeatTimeseries(HEAT_TIMESERIES, 2018).map((e) => e.date)).toEqual([
			'2020-06-26',
			'2024-06-26',
		])
	})

	it('returns the series unfiltered when the construction year is not a number', () => {
		expect(filterHeatTimeseries(HEAT_TIMESERIES, null)).toBe(HEAT_TIMESERIES)
	})

	it('does not modify the input array', () => {
		const series = [...HEAT_TIMESERIES]
		filterHeatTimeseries(series, 2018)
		expect(series).toEqual(HEAT_TIMESERIES)
	})
})

describe('BuildingStyler.createBuildingCharts', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		useToggleStore().helsinkiView = false
	})

	it('sets the filtered series on the store and leaves the entity data unchanged', async () => {
		const entity = new Entity({
			properties: { kavu: 2018, heat_timeseries: [...HEAT_TIMESERIES] },
		})

		await new BuildingStyler().createBuildingCharts(undefined, entity.properties)

		expect(usePropsStore().buildingHeatTimeseries.map((e) => e.date)).toEqual([
			'2020-06-26',
			'2024-06-26',
		])
		expect(entity.properties.heat_timeseries.getValue()).toEqual(HEAT_TIMESERIES)
	})
})
