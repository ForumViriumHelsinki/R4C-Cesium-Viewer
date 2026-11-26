/**
 * @vitest-environment jsdom
 * @tag @unit
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMitigationStore } from '@/stores/mitigationStore'

/**
 * Build a Cesium-like entity whose properties expose the public
 * ConstantProperty surface (`getValue()`), matching production reads.
 * Pass `null` for any property to simulate it being absent on the entity.
 */
function makeGridEntity({ grid_id, final_avg_conditional, euref_x, euref_y }) {
	const prop = (v) => (v === undefined ? undefined : { getValue: () => v })
	return {
		properties: {
			grid_id: prop(grid_id),
			final_avg_conditional: prop(final_avg_conditional),
			euref_x: prop(euref_x),
			euref_y: prop(euref_y),
		},
	}
}

describe('mitigationStore — null/undefined property guards (#828)', () => {
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		store = useMitigationStore()
	})

	describe('setGridCells', () => {
		it('filters out entities when grid_id / euref_x / euref_y are absent', async () => {
			// final_avg_conditional present (would pass the heat filter) but the other
			// required properties are missing — the entity must be dropped entirely
			// rather than mapped to an invalid cell with undefined coordinates.
			const datasource = {
				entities: {
					values: [
						makeGridEntity({
							grid_id: undefined,
							final_avg_conditional: 0.42,
							euref_x: undefined,
							euref_y: undefined,
						}),
					],
				},
			}

			await expect(store.setGridCells(datasource)).resolves.toBeUndefined()
			expect(store.gridCells).toHaveLength(0)
			// A missing grid_id must not create a modifiedHeatIndices entry.
			expect(store.modifiedHeatIndices).not.toHaveProperty('undefined')
		})

		it('still maps fully-populated entities correctly', async () => {
			const datasource = {
				entities: {
					values: [
						makeGridEntity({
							grid_id: 'cell-1',
							final_avg_conditional: 0.5,
							euref_x: 100,
							euref_y: 200,
						}),
					],
				},
			}

			await store.setGridCells(datasource)
			expect(store.gridCells[0]).toEqual({ id: 'cell-1', x: 100, y: 200 })
			expect(store.modifiedHeatIndices['cell-1']).toBe(0.5)
		})
	})
})

describe('mitigationStore — cooling center identity', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('gives each added center a unique id and returns the stored record', () => {
		const store = useMitigationStore()
		const a = store.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 100 })
		const b = store.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 200 })
		expect(a.id).toBeDefined()
		expect(a.id).not.toBe(b.id)
		expect(store.coolingCenters).toEqual([a, b])
	})

	it('removes only the center with the given id and bumps the version', () => {
		const store = useMitigationStore()
		const a = store.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 100 })
		const b = store.addCoolingCenter({ grid_id: 'g2', euref_x: 0, euref_y: 0, capacity: 200 })
		const version = store.coolingCentersVersion

		const removed = store.removeCoolingCenter(a.id)

		expect(removed).toEqual(a)
		expect(store.coolingCenters).toEqual([b])
		expect(store.coolingCentersVersion).toBe(version + 1)
	})

	it('ignores an unknown id', () => {
		const store = useMitigationStore()
		store.addCoolingCenter({ grid_id: 'g1', euref_x: 0, euref_y: 0, capacity: 100 })
		const version = store.coolingCentersVersion
		expect(store.removeCoolingCenter('nope')).toBeNull()
		expect(store.coolingCentersVersion).toBe(version)
	})
})
