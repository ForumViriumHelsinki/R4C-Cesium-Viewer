/**
 * @file Unit tests for ViewportBuildingLoader service (pure functions)
 * @tag @unit
 *
 * Tests pure functions that don't require mocking:
 * - expandBounds() - Viewport buffer zone calculation
 * - getTilesInBounds() - Tile key generation from bounds
 * - buildBboxUrl() - WFS URL construction with BBOX parameter
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import ViewportBuildingLoader from '@/services/viewportBuildingLoader.js'
import { useToggleStore } from '@/stores/toggleStore.js'

describe('ViewportBuildingLoader - Unit Tests', () => {
	let loader
	let toggleStore

	beforeEach(() => {
		// Initialize Pinia before creating loader (loader uses stores in constructor)
		setActivePinia(createPinia())
		toggleStore = useToggleStore()
		loader = new ViewportBuildingLoader()
	})

	describe('expandBounds()', () => {
		it('should expand bounds by specified factor in all directions', () => {
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 25.0,
				north: 60.2,
			}

			const expanded = loader.expandBounds(bounds, 0.2)

			// Width = 0.1, height = 0.1
			// 20% buffer adds 0.02 to each side
			expect(expanded.west).toBeCloseTo(24.88, 5)
			expect(expanded.south).toBeCloseTo(60.08, 5)
			expect(expanded.east).toBeCloseTo(25.02, 5)
			expect(expanded.north).toBeCloseTo(60.22, 5)
		})

		it('should handle zero expansion factor (no change)', () => {
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 25.0,
				north: 60.2,
			}

			const expanded = loader.expandBounds(bounds, 0)

			expect(expanded).toEqual(bounds)
		})

		it('should handle small viewport with large expansion factor', () => {
			const bounds = {
				west: 24.99,
				south: 60.19,
				east: 25.0,
				north: 60.2,
			}

			// 100% expansion should double the bounds in each direction
			const expanded = loader.expandBounds(bounds, 1.0)

			// Width = 0.01, height = 0.01
			// 100% buffer adds 0.01 to each side
			expect(expanded.west).toBeCloseTo(24.98, 5)
			expect(expanded.south).toBeCloseTo(60.18, 5)
			expect(expanded.east).toBeCloseTo(25.01, 5)
			expect(expanded.north).toBeCloseTo(60.21, 5)
		})

		it('should handle wide viewport bounds', () => {
			const bounds = {
				west: 24.5,
				south: 60.1,
				east: 25.5,
				north: 60.3,
			}

			const expanded = loader.expandBounds(bounds, 0.1)

			// Width = 1.0, height = 0.2
			// 10% buffer adds 0.1 to width sides, 0.02 to height sides
			expect(expanded.west).toBeCloseTo(24.4, 5)
			expect(expanded.south).toBeCloseTo(60.08, 5)
			expect(expanded.east).toBeCloseTo(25.6, 5)
			expect(expanded.north).toBeCloseTo(60.32, 5)
		})

		it('should handle negative coordinates (e.g., western hemisphere)', () => {
			const bounds = {
				west: -100.5,
				south: 30.2,
				east: -100.4,
				north: 30.3,
			}

			const expanded = loader.expandBounds(bounds, 0.2)

			expect(expanded.west).toBeLessThan(bounds.west)
			expect(expanded.east).toBeGreaterThan(bounds.east)
			expect(expanded.south).toBeLessThan(bounds.south)
			expect(expanded.north).toBeGreaterThan(bounds.north)
		})
	})

	describe('getTilesInBounds()', () => {
		it('should return single tile for small viewport within one tile', () => {
			// Tile size is 0.01 degrees (~1km)
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 24.905,
				north: 60.105,
			}

			const tiles = loader.getTilesInBounds(bounds)

			expect(tiles).toHaveLength(1)
			expect(tiles[0]).toBe('2490_6010') // Floor(24.90/0.01)_Floor(60.10/0.01)
		})

		it('should return multiple tiles for viewport spanning multiple tiles', () => {
			// Viewport spanning 2x2 tiles
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 24.92, // Spans 3 tiles in X (24.90, 24.91, 24.92)
				north: 60.12, // Spans 3 tiles in Y (60.10, 60.11, 60.12)
			}

			const tiles = loader.getTilesInBounds(bounds)

			// Should have 3x3 = 9 tiles
			expect(tiles.length).toBe(9)

			// Verify key format
			expect(tiles).toContain('2490_6010')
			expect(tiles).toContain('2491_6010')
			expect(tiles).toContain('2492_6010')
			expect(tiles).toContain('2490_6011')
			expect(tiles).toContain('2491_6011')
			expect(tiles).toContain('2492_6011')
			expect(tiles).toContain('2490_6012')
			expect(tiles).toContain('2491_6012')
			expect(tiles).toContain('2492_6012')
		})

		it('should handle bounds on exact tile boundaries', () => {
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 24.9, // Same tile in X
				north: 60.1, // Same tile in Y
			}

			const tiles = loader.getTilesInBounds(bounds)

			expect(tiles).toHaveLength(1)
			expect(tiles[0]).toBe('2490_6010')
		})

		it('should handle large viewport covering many tiles', () => {
			// Large viewport spanning capital region
			const bounds = {
				west: 24.8,
				south: 60.1,
				east: 25.0, // 20 tiles in X
				north: 60.3, // 20 tiles in Y
			}

			const tiles = loader.getTilesInBounds(bounds)

			// Should have 21x21 = 441 tiles
			expect(tiles.length).toBe(441)

			// Verify corners
			expect(tiles).toContain('2480_6010') // SW corner
			expect(tiles).toContain('2500_6030') // NE corner
		})

		it('should handle negative tile indices (e.g., western hemisphere)', () => {
			const bounds = {
				west: -0.01,
				south: -0.01,
				east: 0.01,
				north: 0.01,
			}

			const tiles = loader.getTilesInBounds(bounds)

			// Should span across 0,0 with negative indices
			expect(tiles.length).toBeGreaterThan(1)
			expect(tiles).toContain('-1_-1')
			expect(tiles).toContain('0_0')
			expect(tiles).toContain('1_1')
		})

		it('should generate correct tile key format', () => {
			const bounds = {
				west: 24.945,
				south: 60.175,
				east: 24.955,
				north: 60.185,
			}

			const tiles = loader.getTilesInBounds(bounds)

			// All tiles should match format: "number_number"
			tiles.forEach((tile) => {
				expect(tile).toMatch(/^-?\d+_-?\d+$/)
			})
		})

		it('should handle zero-width bounds', () => {
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 24.9, // Zero width
				north: 60.12,
			}

			const tiles = loader.getTilesInBounds(bounds)

			// Should still return tiles for the vertical strip
			expect(tiles.length).toBeGreaterThan(0)
			tiles.forEach((tile) => {
				expect(tile).toMatch(/^2490_\d+$/)
			})
		})

		it('should handle zero-height bounds', () => {
			const bounds = {
				west: 24.9,
				south: 60.1,
				east: 24.92,
				north: 60.1, // Zero height
			}

			const tiles = loader.getTilesInBounds(bounds)

			// Should still return tiles for the horizontal strip
			expect(tiles.length).toBeGreaterThan(0)
			tiles.forEach((tile) => {
				expect(tile).toMatch(/^\d+_6010$/)
			})
		})
	})

	describe('buildBboxUrl()', () => {
		describe('Helsinki WFS mode (helsinkiView = true)', () => {
			beforeEach(() => {
				toggleStore.helsinkiView = true
			})

			it('should construct valid WFS URL with BBOX parameter', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				// Verify base URL
				expect(url).toContain('https://kartta.hel.fi/ws/geoserver/avoindata/wfs')

				// Verify required WFS parameters
				expect(url).toContain('service=wfs')
				expect(url).toContain('version=2.0.0')
				expect(url).toContain('request=GetFeature')
				expect(url).toContain('typeNames=avoindata%3ARakennukset_alue_rekisteritiedot')
				expect(url).toContain('outputFormat=application%2Fjson')
				expect(url).toContain('srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326')

				// Verify BBOX parameter with correct format and CRS
				expect(url).toContain(
					'bbox=24.9%2C60.1%2C25%2C60.2%2Curn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326'
				)
			})

			it('should handle negative coordinates in BBOX', () => {
				const bounds = {
					west: -100.5,
					south: 30.2,
					east: -100.4,
					north: 30.3,
				}

				const url = loader.buildBboxUrl(bounds)

				// Verify negative coordinates are properly encoded
				expect(url).toContain('bbox=-100.5%2C30.2%2C-100.4%2C30.3')
			})

			it('should handle decimal precision in bounds', () => {
				const bounds = {
					west: 24.123456789,
					south: 60.987654321,
					east: 25.111111111,
					north: 61.222222222,
				}

				const url = loader.buildBboxUrl(bounds)

				// Should preserve full precision
				expect(url).toContain('24.123456789')
				expect(url).toContain('60.987654321')
				expect(url).toContain('25.111111111')
				expect(url).toContain('61.222222222')
			})

			it('should use correct EPSG:4326 CRS', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				// Should include CRS in both srsName and BBOX parameters
				const crsParam = 'urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326'
				expect(url).toContain(`srsName=${crsParam}`)
				expect(url).toContain(`%2C${crsParam}`) // End of BBOX parameter
			})

			it('should request correct building layer', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				// Should request Helsinki buildings layer
				expect(url).toContain('avoindata%3ARakennukset_alue_rekisteritiedot')
			})

			it('should request GeoJSON output format', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				expect(url).toContain('outputFormat=application%2Fjson')
			})

			it('should create valid URL that can be parsed', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				// Should be parseable as URL
				expect(() => new URL(url)).not.toThrow()

				const parsedUrl = new URL(url)
				expect(parsedUrl.protocol).toBe('https:')
				expect(parsedUrl.hostname).toBe('kartta.hel.fi')
				expect(parsedUrl.pathname).toBe('/ws/geoserver/avoindata/wfs')
			})
		})

		describe('HSY pygeoapi mode (helsinkiView = false)', () => {
			beforeEach(() => {
				toggleStore.helsinkiView = false
			})

			it('should construct valid pygeoapi URL with bbox parameter', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				// Verify pygeoapi endpoint
				expect(url).toContain('/pygeoapi/collections/hsy_buildings_optimized/items')
				expect(url).toContain('f=json')
				expect(url).toContain('bbox=24.9,60.1,25,60.2')
			})

			it('should include limit parameter for HSY', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 25.0,
					north: 60.2,
				}

				const url = loader.buildBboxUrl(bounds)

				expect(url).toContain('limit=')
			})

			it('should handle very small tile bounds', () => {
				const bounds = {
					west: 24.9,
					south: 60.1,
					east: 24.91,
					north: 60.11,
				}

				const url = loader.buildBboxUrl(bounds)

				expect(url).toContain('bbox=24.9,60.1,24.91,60.11')
			})

			it('should handle bounds with integer coordinates', () => {
				const bounds = {
					west: 25,
					south: 60,
					east: 26,
					north: 61,
				}

				const url = loader.buildBboxUrl(bounds)

				expect(url).toContain('bbox=25,60,26,61')
			})
		})
	})

	describe('constructor', () => {
		it('should initialize with correct default state', () => {
			const loader = new ViewportBuildingLoader()

			expect(loader.viewer).toBeNull()
			expect(loader.isInitialized).toBe(false)
			expect(loader.loadedTiles).toBeInstanceOf(Map)
			expect(loader.loadedTiles.size).toBe(0)
			expect(loader.visibleTiles).toBeInstanceOf(Set)
			expect(loader.visibleTiles.size).toBe(0)
			expect(loader.loadingTiles).toBeInstanceOf(Set)
			expect(loader.loadingTiles.size).toBe(0)
			expect(loader.loadingQueue).toEqual([])
			expect(loader.activeLoads).toBe(0)
			expect(loader.debounceTimeout).toBeNull()
		})

		it('should initialize service dependencies', () => {
			const loader = new ViewportBuildingLoader()

			expect(loader.datasourceService).toBeDefined()
			expect(loader.urbanheatService).toBeDefined()
			expect(loader.unifiedLoader).toBeDefined()
		})

		it('should initialize Cesium scratch objects for performance', () => {
			const loader = new ViewportBuildingLoader()

			expect(loader.scratchRectangle).toBeDefined()
		})
	})
})
