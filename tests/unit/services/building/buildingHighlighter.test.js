/**
 * Building Highlighter Tests
 *
 * Tests for building outline and highlighting functionality.
 */

import * as Cesium from 'cesium'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingHighlighter } from '../../../../src/services/building/buildingHighlighter.js'

// Mock dependencies
vi.mock('../../../../src/stores/globalStore.js', () => ({
	useGlobalStore: () => ({
		postalcode: '00100',
		heatDataDate: '2023-06-21',
		cesiumViewer: null,
		setPickedEntity: vi.fn(),
	}),
}))

vi.mock('../../../../src/stores/toggleStore.js', () => ({
	useToggleStore: () => ({
		helsinkiView: true,
	}),
}))

vi.mock('../../../../src/services/datasource.js', () => {
	return {
		default: class {
			getDataSourceByName() {
				return null
			}
		},
	}
})

vi.mock('../../../../src/services/eventEmitter.js', () => ({
	eventBus: {
		emit: vi.fn(),
	},
}))

describe('BuildingHighlighter', () => {
	let highlighter

	beforeEach(() => {
		highlighter = new BuildingHighlighter()
		vi.clearAllMocks()
	})

	describe('polygonOutlineToBlack', () => {
		it('should set outline color to black when polygon exists', () => {
			const entity = {
				polygon: {
					outlineColor: null,
					outlineWidth: null,
				},
			}

			highlighter.polygonOutlineToBlack(entity)

			expect(entity.polygon.outlineColor).toBe(Cesium.Color.BLACK)
			expect(entity.polygon.outlineWidth).toBe(8)
		})

		it('should not throw error when entity is undefined', () => {
			const entity = undefined

			expect(() => {
				highlighter.polygonOutlineToBlack(entity)
			}).not.toThrow()
		})

		it('should not throw error when entity.polygon is undefined', () => {
			const entity = {
				id: 'building-123',
				// no polygon property
			}

			expect(() => {
				highlighter.polygonOutlineToBlack(entity)
			}).not.toThrow()
		})

		it('should not throw error when entity.polygon is null', () => {
			const entity = {
				id: 'building-123',
				polygon: null,
			}

			expect(() => {
				highlighter.polygonOutlineToBlack(entity)
			}).not.toThrow()
		})

		it('should skip polygon update when entity is removed from datasource', () => {
			const entity = {
				id: 'building-456',
				// Entity was removed from datasource, no polygon
			}

			expect(() => {
				highlighter.polygonOutlineToBlack(entity)
			}).not.toThrow()
		})
	})

	describe('polygonOutlineToYellow', () => {
		it('should set outline color to yellow when polygon exists', () => {
			const entity = {
				polygon: {
					outline: null,
					outlineColor: null,
					outlineWidth: null,
				},
			}

			highlighter.polygonOutlineToYellow(entity)

			expect(entity.polygon.outline).toBe(true)
			expect(entity.polygon.outlineColor).toBe(Cesium.Color.YELLOW)
			expect(entity.polygon.outlineWidth).toBe(20)
		})

		it('should not throw error when entity.polygon is undefined', () => {
			const entity = {
				id: 'building-789',
			}

			expect(() => {
				highlighter.polygonOutlineToYellow(entity)
			}).not.toThrow()
		})
	})

	describe('resetBuildingOutline', () => {
		it('should handle case when building datasource does not exist', () => {
			// With mocked datasource returning null, this should not throw
			expect(() => {
				highlighter.resetBuildingOutline()
			}).not.toThrow()
		})
	})
})
