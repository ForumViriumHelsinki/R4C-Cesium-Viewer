/**
 * @module services/viewportTileSelection
 * Chooses the building tiles to load for the ground the camera can see.
 *
 * The ground footprint is a convex polygon (lon/lat degrees) built from the
 * canvas border's ground picks. Tiles that touch it are ranked by horizontal
 * distance from the camera's ground point to the tile's nearest edge, so the
 * tile budget fills from the camera outwards: near tiles cover more of the
 * screen than far ones (#1214).
 *
 * Tiles are enumerated in square rings around the camera's tile and the search
 * stops once no further ring can hold a tile nearer than the ones kept, or
 * beyond `maxDistance`. The cost depends on the budget and the distance limit,
 * not on how far towards the horizon the view reaches (#1074).
 */

/** Metres per degree of latitude (and of longitude at the equator). */
const METERS_PER_DEGREE = 111320

/**
 * @typedef {{lon: number, lat: number}} LonLat
 */

/**
 * Convex hull of a set of points (Andrew's monotone chain), counter-clockwise.
 * Collinear and duplicate points are dropped.
 *
 * @param {LonLat[]} points
 * @returns {LonLat[]}
 */
export function convexHull(points) {
	const sorted = [...points].sort((a, b) => a.lon - b.lon || a.lat - b.lat)
	if (sorted.length < 3) return sorted
	const cross = (o, a, b) => (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon)
	const lower = []
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop()
		lower.push(p)
	}
	const upper = []
	for (let i = sorted.length - 1; i >= 0; i--) {
		const p = sorted[i]
		while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop()
		upper.push(p)
	}
	return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/**
 * Whether grid tile (x, y) overlaps a convex polygon (separating axis test).
 * Touching along an edge or at a corner does not count: such a tile shows none
 * of the polygon.
 *
 * @param {number} x - Tile column
 * @param {number} y - Tile row
 * @param {number} tileSize - Tile size in degrees
 * @param {LonLat[]} polygon - Convex polygon, either winding
 * @returns {boolean}
 */
export function tileIntersectsPolygon(x, y, tileSize, polygon) {
	const west = x * tileSize
	const east = west + tileSize
	const south = y * tileSize
	const north = south + tileSize

	let minLon = Infinity
	let maxLon = -Infinity
	let minLat = Infinity
	let maxLat = -Infinity
	for (const p of polygon) {
		minLon = Math.min(minLon, p.lon)
		maxLon = Math.max(maxLon, p.lon)
		minLat = Math.min(minLat, p.lat)
		maxLat = Math.max(maxLat, p.lat)
	}
	if (maxLon <= west || minLon >= east || maxLat <= south || minLat >= north) return false

	const corners = [
		[west, south],
		[east, south],
		[east, north],
		[west, north],
	]
	for (let i = 0; i < polygon.length; i++) {
		const a = polygon[i]
		const b = polygon[(i + 1) % polygon.length]
		// Edge normal; project the polygon and the tile onto it.
		const nx = b.lat - a.lat
		const ny = a.lon - b.lon
		let polyMin = Infinity
		let polyMax = -Infinity
		for (const p of polygon) {
			const d = p.lon * nx + p.lat * ny
			polyMin = Math.min(polyMin, d)
			polyMax = Math.max(polyMax, d)
		}
		let tileMin = Infinity
		let tileMax = -Infinity
		for (const [cx, cy] of corners) {
			const d = cx * nx + cy * ny
			tileMin = Math.min(tileMin, d)
			tileMax = Math.max(tileMax, d)
		}
		if (tileMax <= polyMin || tileMin >= polyMax) return false
	}
	return true
}

/**
 * Pick at most `limit` tiles touching the footprint, nearest the origin first.
 *
 * @param {Object} options
 * @param {LonLat[]} options.footprint - Convex ground polygon in degrees
 * @param {LonLat} options.origin - Ground point distances are measured from (below the camera)
 * @param {number} options.tileSize - Tile size in degrees
 * @param {number} options.limit - Maximum number of tiles
 * @param {number} options.maxDistance - Horizontal distance limit in metres
 * @returns {{keys: string[], examined: number}} Tile keys ("x_y") and the number of tiles tested
 */
export function selectViewTiles({ footprint, origin, tileSize, limit, maxDistance }) {
	if (footprint.length === 0 || limit <= 0) return { keys: [], examined: 0 }

	const metersPerLon = METERS_PER_DEGREE * Math.cos((origin.lat * Math.PI) / 180)
	const tileWidth = tileSize * metersPerLon
	const tileHeight = tileSize * METERS_PER_DEGREE
	const minTileDimension = Math.min(tileWidth, tileHeight)

	const lons = footprint.map((p) => p.lon)
	const lats = footprint.map((p) => p.lat)
	const minX = Math.floor(Math.min(...lons) / tileSize)
	const maxX = Math.floor(Math.max(...lons) / tileSize)
	const minY = Math.floor(Math.min(...lats) / tileSize)
	const maxY = Math.floor(Math.max(...lats) / tileSize)

	const ox = Math.floor(origin.lon / tileSize)
	const oy = Math.floor(origin.lat / tileSize)
	const lastRing = Math.max(ox - minX, maxX - ox, oy - minY, maxY - oy)

	/** Distance (m) from the origin to the tile's nearest point, and to its centre. */
	const distances = (x, y) => {
		const west = x * tileSize
		const south = y * tileSize
		const nearLon = Math.min(Math.max(origin.lon, west), west + tileSize)
		const nearLat = Math.min(Math.max(origin.lat, south), south + tileSize)
		return {
			near: Math.hypot(
				(nearLon - origin.lon) * metersPerLon,
				(nearLat - origin.lat) * METERS_PER_DEGREE
			),
			centre: Math.hypot(
				(west + tileSize / 2 - origin.lon) * metersPerLon,
				(south + tileSize / 2 - origin.lat) * METERS_PER_DEGREE
			),
		}
	}

	/** @type {{key: string, near: number, centre: number}[]} */
	const candidates = []
	let examined = 0
	const consider = (x, y) => {
		if (x < minX || x > maxX || y < minY || y > maxY) return
		examined++
		const { near, centre } = distances(x, y)
		if (near > maxDistance) return
		if (!tileIntersectsPolygon(x, y, tileSize, footprint)) return
		candidates.push({ key: `${x}_${y}`, near, centre })
	}
	const byDistance = (a, b) => a.near - b.near || a.centre - b.centre || (a.key < b.key ? -1 : 1)

	for (let r = 0; r <= lastRing; r++) {
		// No tile in ring r is nearer than (r - 1) whole tiles from the origin.
		const ringMin = Math.max(0, r - 1) * minTileDimension
		if (ringMin > maxDistance) break
		if (candidates.length >= limit) {
			candidates.sort(byDistance)
			candidates.length = limit
			if (ringMin > candidates[limit - 1].near) break
		}
		if (r === 0) {
			consider(ox, oy)
			continue
		}
		// Top and bottom rows of the ring, clipped to the footprint's columns.
		for (let x = Math.max(ox - r, minX); x <= Math.min(ox + r, maxX); x++) {
			consider(x, oy - r)
			consider(x, oy + r)
		}
		// Left and right columns, without the corners.
		for (let y = Math.max(oy - r + 1, minY); y <= Math.min(oy + r - 1, maxY); y++) {
			consider(ox - r, y)
			consider(ox + r, y)
		}
	}

	candidates.sort(byDistance)
	return { keys: candidates.slice(0, limit).map((c) => c.key), examined }
}

/**
 * Ground footprint of the view: the convex hull of the canvas border's ground picks.
 *
 * Border points whose ray misses the ground (sky above the horizon) are left
 * out, so a pitched view's footprint ends at the last ground pick on each side
 * edge. Returns null when fewer than three distinct ground points were found.
 *
 * @param {(x: number, y: number) => LonLat | undefined} pick - Canvas pixel to ground point
 * @param {number} width - Canvas width in CSS pixels
 * @param {number} height - Canvas height in CSS pixels
 * @param {number} [samplesPerEdge=8] - Segments per canvas edge
 * @returns {LonLat[] | null}
 */
export function footprintFromPicks(pick, width, height, samplesPerEdge = 8) {
	const points = []
	for (let i = 0; i <= samplesPerEdge; i++) {
		const t = i / samplesPerEdge
		for (const [x, y] of [
			[t * width, height],
			[t * width, 0],
			[0, t * height],
			[width, t * height],
		]) {
			const p = pick(x, y)
			if (p) points.push(p)
		}
	}
	const hull = convexHull(points)
	return hull.length >= 3 ? hull : null
}
