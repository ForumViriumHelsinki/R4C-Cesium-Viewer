/**
 * Mock PyGeoAPI Server
 *
 * Lightweight Bun server that mimics PyGeoAPI endpoints for local development.
 * Supports query parameter filtering (postinumero, bbox, limit) for realistic testing.
 *
 * Usage:
 *   bun run dev     # Start with hot reload
 *   bun run start   # Production start
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PORT = Number(process.env.PORT) || 5050
const FIXTURES_DIR = join(import.meta.dir, 'fixtures')

// Collection configurations
interface CollectionConfig {
	file: string
	idField: string
	postalCodeField?: string // Field name for postal code filtering
	supportsPostalCode: boolean
	supportsBbox: boolean
}

const COLLECTIONS: Record<string, CollectionConfig> = {
	hsy_buildings_optimized: {
		file: 'buildings.json',
		idField: 'vtj_prt',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: true,
	},
	heatexposure_optimized: {
		file: 'heatexposure.json',
		idField: 'id',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	urban_heat_building: {
		file: 'urban_heat_building.json',
		idField: 'id',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	tree: {
		file: 'trees.json',
		idField: 'id',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	coldarea: {
		file: 'coldarea.json',
		idField: 'id',
		postalCodeField: 'posno',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	adaptation_landcover: {
		file: 'adaptation_landcover.json',
		idField: 'id',
		supportsPostalCode: false,
		supportsBbox: true,
	},
	tree_building_distance: {
		file: 'tree_building_distance.json',
		idField: 'id',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	othernature: {
		file: 'othernature.json',
		idField: 'id',
		postalCodeField: 'postinumero',
		supportsPostalCode: true,
		supportsBbox: false,
	},
	hki_travel_time: {
		file: 'travel_time.json',
		idField: 'id',
		supportsPostalCode: false,
		supportsBbox: false,
	},
	// GeoJSON file collections (pass-through)
	populationgrid: {
		file: 'populationgrid.json',
		idField: 'id',
		supportsPostalCode: false,
		supportsBbox: false,
	},
	capitalregion_postalcode: {
		file: 'capitalregion_postalcode.json',
		idField: 'id',
		supportsPostalCode: false,
		supportsBbox: false,
	},
}

// Cache loaded fixtures
const fixtureCache = new Map<string, GeoJSON.FeatureCollection>()

interface GeoJSONFeature {
	type: 'Feature'
	id?: string | number
	geometry: {
		type: string
		coordinates: number[] | number[][] | number[][][]
	}
	properties: Record<string, unknown>
}

function loadFixture(filename: string): GeoJSON.FeatureCollection | null {
	if (fixtureCache.has(filename)) {
		return fixtureCache.get(filename)!
	}

	const filepath = join(FIXTURES_DIR, filename)
	if (!existsSync(filepath)) {
		console.warn(`Fixture not found: ${filepath}`)
		return null
	}

	try {
		const data = JSON.parse(readFileSync(filepath, 'utf-8'))
		fixtureCache.set(filename, data)
		return data
	} catch (error) {
		console.error(`Error loading fixture ${filename}:`, error)
		return null
	}
}

function filterByPostalCode(
	features: GeoJSONFeature[],
	postalCode: string,
	field: string
): GeoJSONFeature[] {
	return features.filter((f) => f.properties[field] === postalCode)
}

function filterByBbox(
	features: GeoJSONFeature[],
	bbox: string
): GeoJSONFeature[] {
	const [west, south, east, north] = bbox.split(',').map(Number)

	return features.filter((f) => {
		const geom = f.geometry
		if (!geom || !geom.coordinates) return false

		// Get centroid for filtering (simplified - works for points and polygons)
		let lon: number, lat: number

		if (geom.type === 'Point') {
			;[lon, lat] = geom.coordinates as number[]
		} else if (geom.type === 'Polygon') {
			// Use first coordinate of first ring as approximation
			const coords = geom.coordinates as number[][][]
			;[lon, lat] = coords[0][0]
		} else if (geom.type === 'MultiPolygon') {
			const coords = geom.coordinates as number[][][][]
			;[lon, lat] = coords[0][0][0]
		} else {
			return true // Include if we can't determine bbox intersection
		}

		return lon >= west && lon <= east && lat >= south && lat <= north
	})
}

function handleCollectionItems(
	collection: string,
	url: URL
): Response | null {
	const config = COLLECTIONS[collection]
	if (!config) {
		return null
	}

	const data = loadFixture(config.file)
	if (!data) {
		return Response.json(
			{ type: 'FeatureCollection', features: [] },
			{
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		)
	}

	let features = [...data.features] as GeoJSONFeature[]

	// Filter by postal code
	const postalCode =
		url.searchParams.get('postinumero') || url.searchParams.get('posno')
	if (postalCode && config.supportsPostalCode && config.postalCodeField) {
		features = filterByPostalCode(features, postalCode, config.postalCodeField)
	}

	// Filter by bbox
	const bbox = url.searchParams.get('bbox')
	if (bbox && config.supportsBbox) {
		features = filterByBbox(features, bbox)
	}

	// Filter by koodi (for tree collection)
	const koodi = url.searchParams.get('koodi')
	if (koodi && collection === 'tree') {
		features = features.filter((f) => f.properties.koodi === koodi)
	}

	// Filter by grid_id (for adaptation_landcover)
	const gridId = url.searchParams.get('grid_id')
	if (gridId && collection === 'adaptation_landcover') {
		features = features.filter((f) => f.properties.grid_id === gridId)
	}

	// Filter by from_id (for travel_time)
	const fromId = url.searchParams.get('from_id')
	if (fromId && collection === 'hki_travel_time') {
		features = features.filter(
			(f) => f.properties.from_id === Number(fromId)
		)
	}

	// Apply limit
	const limit = Number(url.searchParams.get('limit')) || 1000
	features = features.slice(0, limit)

	const response = {
		type: 'FeatureCollection',
		numberMatched: features.length,
		numberReturned: features.length,
		features,
	}

	return Response.json(response, {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
		},
	})
}

function handleCollections(): Response {
	const collections = Object.entries(COLLECTIONS).map(([id, config]) => ({
		id,
		title: id.replace(/_/g, ' '),
		description: `Mock ${id} collection`,
		links: [
			{
				rel: 'items',
				href: `/collections/${id}/items`,
				type: 'application/geo+json',
			},
		],
	}))

	return Response.json(
		{ collections },
		{
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		}
	)
}

const server = Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url)
		const path = url.pathname

		// CORS preflight
		if (req.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			})
		}

		// Root / health check
		if (path === '/' || path === '/health') {
			return Response.json({
				status: 'ok',
				server: 'r4c-mock-api',
				collections: Object.keys(COLLECTIONS).length,
			})
		}

		// List collections
		if (path === '/collections' || path === '/collections/') {
			return handleCollections()
		}

		// Collection items: /collections/{collection}/items
		const itemsMatch = path.match(/^\/collections\/([^/]+)\/items\/?$/)
		if (itemsMatch) {
			const collection = itemsMatch[1]
			const response = handleCollectionItems(collection, url)
			if (response) return response
		}

		// Single collection metadata: /collections/{collection}
		const collectionMatch = path.match(/^\/collections\/([^/]+)\/?$/)
		if (collectionMatch) {
			const collection = collectionMatch[1]
			const config = COLLECTIONS[collection]
			if (config) {
				return Response.json(
					{
						id: collection,
						title: collection.replace(/_/g, ' '),
						description: `Mock ${collection} collection`,
					},
					{
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					}
				)
			}
		}

		// 404 for unmatched routes
		return Response.json(
			{ error: 'Not found', path },
			{
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		)
	},
})

console.log(`
  Mock PyGeoAPI Server
  ====================

  Running on: http://localhost:${PORT}

  Collections:
${Object.keys(COLLECTIONS)
	.map((c) => `    - /collections/${c}/items`)
	.join('\n')}

  Query parameters:
    ?postinumero=00100  Filter by postal code
    ?bbox=w,s,e,n       Filter by bounding box
    ?limit=100          Limit results
    ?koodi=T510         Filter trees by height code
    ?grid_id=GRID_001   Filter landcover by grid

  Press Ctrl+C to stop
`)
