/**
 * @file Building tile selection for the visible ground (#1074, #1214)
 * @tag @unit
 *
 * `selectViewTiles` picks the building tiles to load from the ground the
 * camera can see (a convex footprint polygon), nearest the camera first.
 *
 * #1074: the previous selection listed every tile in the view rectangle and
 * sorted them to keep 50. For a camera pitched towards the horizon that
 * rectangle held 122,694 tiles. The ring enumeration here examines a number of
 * tiles that depends on the tile budget and the distance limit, not on how far
 * the rectangle reaches.
 *
 * #1214: ranking by distance from the screen-centre ground point spent the
 * budget on a disc around that point, much of it off-screen at the sides, and
 * left the far part of the view empty. Tiles outside the footprint are now
 * never selected, and the budget fills from the camera outwards.
 */

import { describe, expect, it } from 'vitest'
import {
	convexHull,
	selectViewTiles,
	tileIntersectsPolygon,
} from '@/services/viewportTileSelection.js'

const TILE = 0.01
const M_PER_DEG = 111320

/** Tile key for a lon/lat point. */
const keyAt = (lon, lat) => `${Math.floor(lon / TILE)}_${Math.floor(lat / TILE)}`

/** Horizontal distance (m) from origin to the nearest point of a tile. */
function nearestDistance(key, origin) {
	const [x, y] = key.split('_').map(Number)
	const cos = Math.cos((origin.lat * Math.PI) / 180)
	const lon = Math.min(Math.max(origin.lon, x * TILE), (x + 1) * TILE)
	const lat = Math.min(Math.max(origin.lat, y * TILE), (y + 1) * TILE)
	return Math.hypot((lon - origin.lon) * cos * M_PER_DEG, (lat - origin.lat) * M_PER_DEG)
}

/** Every tile in the polygon's bounding box that touches the polygon: the reference set. */
function bruteForce(footprint, origin, maxDistance) {
	const xs = footprint.map((p) => p.lon)
	const ys = footprint.map((p) => p.lat)
	const keys = []
	for (let x = Math.floor(Math.min(...xs) / TILE); x <= Math.floor(Math.max(...xs) / TILE); x++) {
		for (let y = Math.floor(Math.min(...ys) / TILE); y <= Math.floor(Math.max(...ys) / TILE); y++) {
			const key = `${x}_${y}`
			if (
				tileIntersectsPolygon(x, y, TILE, footprint) &&
				nearestDistance(key, origin) <= maxDistance
			) {
				keys.push(key)
			}
		}
	}
	return keys
}

// Ground footprint of a camera at 1,500 m over Helsinki looking north at
// pitch -20: narrow near the camera, about 140 km wide where it meets the
// horizon. Its bounding box holds tens of thousands of tiles.
const origin = { lon: 24.94, lat: 60.165 }
const horizonFootprint = [
	{ lon: 24.925, lat: 60.18 },
	{ lon: 24.955, lat: 60.18 },
	{ lon: 26.2, lat: 61.38 },
	{ lon: 23.68, lat: 61.38 },
]

describe('selectViewTiles', () => {
	it('examines a bounded number of tiles however far the footprint reaches (#1074)', () => {
		const { keys, examined } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 50,
			maxDistance: 10000,
		})

		expect(keys).toHaveLength(50)
		// The footprint's bounding box: 252 x 120 = 30,240 tiles.
		expect(examined).toBeLessThan(1000)
	})

	it('keeps the same tiles as ranking every tile in the footprint', () => {
		const maxDistance = 10000
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 50,
			maxDistance,
		})

		const reference = bruteForce(horizonFootprint, origin, maxDistance)
			.map((key) => ({ key, d: nearestDistance(key, origin) }))
			.sort((a, b) => a.d - b.d)
		const cutoff = reference[49].d
		// Every kept tile is at least as near as the 50th reference tile, and every
		// reference tile nearer than that is kept.
		for (const key of keys) expect(nearestDistance(key, origin)).toBeLessThanOrEqual(cutoff + 1e-6)
		for (const { key, d } of reference) if (d < cutoff - 1e-6) expect(keys).toContain(key)
	})

	it('returns nearest tiles first', () => {
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 50,
			maxDistance: 10000,
		})
		const distances = keys.map((key) => nearestDistance(key, origin))
		expect(distances).toEqual([...distances].sort((a, b) => a - b))
	})

	it('never selects a tile outside the footprint (#1214)', () => {
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 50,
			maxDistance: 10000,
		})
		for (const key of keys) {
			const [x, y] = key.split('_').map(Number)
			expect(tileIntersectsPolygon(x, y, TILE, horizonFootprint)).toBe(true)
		}
		// Beside the camera, outside the narrow near edge of the footprint.
		expect(keys).not.toContain(keyAt(24.9, 60.185))
		expect(keys).not.toContain(keyAt(24.98, 60.185))
	})

	it('reaches further along the view than a disc around the screen centre', () => {
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 50,
			maxDistance: 10000,
		})
		// The screen-centre ground point is about 4 km north of the camera.
		// The kept tiles reach past it to at least 6 km.
		const reach = Math.max(...keys.map((key) => nearestDistance(key, origin)))
		expect(reach).toBeGreaterThan(6000)
	})

	it('selects nothing beyond maxDistance', () => {
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin,
			tileSize: TILE,
			limit: 500,
			maxDistance: 3000,
		})
		expect(keys.length).toBeGreaterThan(0)
		expect(keys.length).toBeLessThan(500)
		for (const key of keys) expect(nearestDistance(key, origin)).toBeLessThanOrEqual(3000)
	})

	it('selects every tile of a footprint smaller than the budget', () => {
		const square = [
			{ lon: 24.9005, lat: 60.1005 },
			{ lon: 24.9395, lat: 60.1005 },
			{ lon: 24.9395, lat: 60.1395 },
			{ lon: 24.9005, lat: 60.1395 },
		]
		const { keys } = selectViewTiles({
			footprint: square,
			origin: { lon: 24.92, lat: 60.12 },
			tileSize: TILE,
			limit: 50,
			maxDistance: 10000,
		})
		expect(keys.sort()).toEqual(bruteForce(square, { lon: 24.92, lat: 60.12 }, 10000).sort())
		expect(keys).toHaveLength(16)
	})

	it('finds the footprint when the origin lies outside it', () => {
		// The camera stands south of the near edge, as for any pitched view.
		const { keys } = selectViewTiles({
			footprint: horizonFootprint,
			origin: { lon: 24.944, lat: 60.1 },
			tileSize: TILE,
			limit: 10,
			maxDistance: 20000,
		})
		expect(keys).toHaveLength(10)
		expect(keys[0]).toBe(keyAt(24.94, 60.185))
	})

	it('returns nothing for an empty footprint', () => {
		expect(
			selectViewTiles({ footprint: [], origin, tileSize: TILE, limit: 50, maxDistance: 10000 }).keys
		).toEqual([])
	})
})

describe('tileIntersectsPolygon', () => {
	const triangle = [
		{ lon: 0, lat: 0 },
		{ lon: 0.1, lat: 0 },
		{ lon: 0, lat: 0.1 },
	]

	it('detects a tile inside, overlapping and outside a convex polygon', () => {
		expect(tileIntersectsPolygon(1, 1, TILE, triangle)).toBe(true)
		expect(tileIntersectsPolygon(4, 5, TILE, triangle)).toBe(true) // straddles the hypotenuse
		expect(tileIntersectsPolygon(6, 6, TILE, triangle)).toBe(false) // beyond the hypotenuse, inside the bbox
		expect(tileIntersectsPolygon(-1, 0, TILE, triangle)).toBe(false) // shares only the edge lon = 0
	})
})

describe('convexHull', () => {
	it('drops interior and duplicate points', () => {
		const hull = convexHull([
			{ lon: 0, lat: 0 },
			{ lon: 1, lat: 0 },
			{ lon: 0.5, lat: 0.5 },
			{ lon: 1, lat: 1 },
			{ lon: 0, lat: 1 },
			{ lon: 0, lat: 0 },
		])
		expect(hull).toHaveLength(4)
		expect(hull).not.toContainEqual({ lon: 0.5, lat: 0.5 })
	})
})
