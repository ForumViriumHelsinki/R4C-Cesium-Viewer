import { describe, expect, it, vi } from 'vitest'
import HSYBuilding from '@/services/hsybuilding.js'

// Real Cesium entity (tests/setup.js mocks `cesium` globally): the picked grid cell
// stored in globalStore.currentGridCell carries a PropertyBag, whose values are
// ConstantProperty wrappers rather than numbers.
const { Entity } = await vi.importActual('cesium')

const AGE_GROUPS = {
	ika0_9: 'pop_d_0_9',
	ika10_19: 'pop_d_10_19',
	ika20_29: 'pop_d_20_29',
	ika30_39: 'pop_d_30_39',
	ika40_49: 'pop_d_40_49',
	ika50_59: 'pop_d_50_59',
	ika60_69: 'pop_d_60_69',
	ika70_79: 'pop_d_70_79',
	ika_yli80: 'pop_d_over80',
}

const gridCell = (asukkaita, perGroup) =>
	new Entity({
		properties: {
			asukkaita,
			...Object.fromEntries(Object.keys(AGE_GROUPS).map((key) => [key, perGroup])),
		},
	})

// The grid-attribute methods only read this.store, so they run without the
// service's loaders and datasources.
const withGridCell = (cell) => ({ store: { currentGridCell: cell } })

describe('HSYBuilding grid attributes from a real grid-cell entity', () => {
	it('skips a cell with no residents instead of writing NaN', () => {
		const feature = { properties: {} }

		HSYBuilding.prototype.setGridAttributesForWithinBuilding.call(
			withGridCell(gridCell(0, 0)),
			feature
		)

		expect(feature.properties).toEqual({})
	})

	it('computes each age share from the cell values', () => {
		const feature = { properties: {} }

		HSYBuilding.prototype.setGridAttributesForWithinBuilding.call(
			withGridCell(gridCell(90, 10)),
			feature
		)

		expect(feature.properties).toEqual(
			Object.fromEntries(Object.values(AGE_GROUPS).map((key) => [key, '0.1111']))
		)
	})

	it('skips an intersecting building when the cell has no residents', () => {
		const feature = {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[24.9, 60.1],
						[24.91, 60.1],
						[24.91, 60.11],
						[24.9, 60.1],
					],
				],
			},
		}

		HSYBuilding.prototype.approximateAttributesForIntersectingBuildings.call(
			{
				store: { currentGridCell: gridCell(0, 0) },
				datasourceService: { getDataSourceByName: () => ({ entities: { values: [] } }) },
				getWeight: () => 1,
				setInitialAttributesForIntersectingBuilding:
					HSYBuilding.prototype.setInitialAttributesForIntersectingBuilding,
				approximateOtherAttributesForIntersectingBuilding: () => {},
				entityToGeoJson: () => null,
			},
			feature
		)

		expect(feature.properties).toEqual({})
	})

	it('weights the cell shares for an intersecting building next to other cells', () => {
		const feature = {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[24.9, 60.1],
						[24.91, 60.1],
						[24.91, 60.11],
						[24.9, 60.1],
					],
				],
			},
		}
		const cell = gridCell(90, 10)
		cell.properties.addProperty('index', 1)
		const neighbour = new Entity({ properties: { index: 2 } })

		HSYBuilding.prototype.approximateAttributesForIntersectingBuildings.call(
			{
				store: { currentGridCell: cell },
				datasourceService: {
					getDataSourceByName: () => ({ entities: { values: [neighbour] } }),
				},
				getWeight: () => 0.5,
				setInitialAttributesForIntersectingBuilding:
					HSYBuilding.prototype.setInitialAttributesForIntersectingBuilding,
				approximateOtherAttributesForIntersectingBuilding: () => {},
				entityToGeoJson: () => ({ ...feature, properties: { index: 2 } }),
			},
			feature
		)

		expect(feature.properties.pop_d_0_9).toBeCloseTo(0.5 * 0.1111)
	})
})
