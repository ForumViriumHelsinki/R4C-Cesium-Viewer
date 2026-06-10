import { describe, expect, it } from 'vitest'
import { buildWmsGetMapUrl, lngLatToMercator, mercatorBBoxString } from '@/utils/deckglWms'

describe('deckglWms', () => {
	describe('lngLatToMercator', () => {
		it('maps the origin to (0, 0)', () => {
			const [x, y] = lngLatToMercator(0, 0)
			expect(x).toBeCloseTo(0, 6)
			expect(y).toBeCloseTo(0, 6)
		})

		it('maps Helsinki (24.945, 60.17) to known EPSG:3857 meters', () => {
			// Reference values from the standard spherical Web Mercator transform.
			const [x, y] = lngLatToMercator(24.945, 60.17)
			expect(x).toBeCloseTo(2776864.7, 0)
			expect(y).toBeCloseTo(8437684.16, 0)
		})

		it('clamps near-polar latitudes instead of returning Infinity', () => {
			const [, y] = lngLatToMercator(0, 90)
			expect(Number.isFinite(y)).toBe(true)
		})
	})

	describe('mercatorBBoxString', () => {
		it('returns minx,miny,maxx,maxy (EPSG:3857 axis order)', () => {
			const bbox = { west: 24.9, south: 60.1, east: 25.0, north: 60.2 }
			const str = mercatorBBoxString(bbox)
			const [minX, minY, maxX, maxY] = str.split(',').map(Number)
			expect(minX).toBeLessThan(maxX)
			expect(minY).toBeLessThan(maxY)
		})
	})

	describe('buildWmsGetMapUrl', () => {
		const bbox = { west: 24.9, south: 60.1, east: 25.0, north: 60.2 }

		it('builds a WMS 1.3.0 GetMap request in EPSG:3857 through /wms/proxy', () => {
			const url = buildWmsGetMapUrl({ bbox, layers: 'asuminen_ja_maankaytto:maanpeite_vesi_2024' })
			expect(url.startsWith('/wms/proxy?')).toBe(true)
			const params = new URLSearchParams(url.split('?')[1])
			expect(params.get('service')).toBe('WMS')
			expect(params.get('request')).toBe('GetMap')
			expect(params.get('version')).toBe('1.3.0')
			expect(params.get('crs')).toBe('EPSG:3857')
			expect(params.get('layers')).toBe('asuminen_ja_maankaytto:maanpeite_vesi_2024')
			expect(params.get('format')).toBe('image/png')
			expect(params.get('width')).toBe('256')
			expect(params.get('bbox')).toBe(mercatorBBoxString(bbox))
		})

		it('honors a custom base URL and tile size', () => {
			const url = buildWmsGetMapUrl({
				bbox,
				layers: 'x',
				baseUrl: 'https://kartta.hsy.fi/geoserver/wms',
				tileSize: 512,
			})
			expect(url.startsWith('https://kartta.hsy.fi/geoserver/wms?')).toBe(true)
			const params = new URLSearchParams(url.split('?')[1])
			expect(params.get('width')).toBe('512')
			expect(params.get('height')).toBe('512')
		})
	})
})
