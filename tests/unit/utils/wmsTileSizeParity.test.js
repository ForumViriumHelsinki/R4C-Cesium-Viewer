/**
 * WMS tile-size parity between the Cesium and deck.gl paths (#966).
 *
 * Every Cesium WebMapServiceImageryProvider requests 512 px tiles (#340). The
 * deck.gl grid view's TileLayer used 256, and deck picks its tile zoom as
 * round(zoom + log2(512 / tileSize)), so 256 loads one zoom level deeper:
 * four times the /wms/proxy GetMap requests for the same view. The TileLayer
 * tileSize and the GetMap width/height are set in two places and must also
 * match each other, or tiles are stretched (blurry) or oversized.
 *
 * This reads the source statically, so it covers call sites that unit tests
 * cannot mount (the deck.gl view loads its layers lazily).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildWmsGetMapUrl, WMS_TILE_SIZE } from '@/utils/deckglWms'

// Named constants a tile-size property may reference instead of a literal.
const KNOWN_CONSTANTS = { WMS_TILE_SIZE }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const EXPECTED = 512

const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) return walk(path)
		return /\.(js|ts|vue)$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
	})

const SOURCES = walk(join(ROOT, 'src')).map((path) => ({
	file: relative(ROOT, path),
	code: readFileSync(path, 'utf-8'),
}))

/** Text of the balanced `{ ... }` argument that follows each match of `opener`. */
function objectArgs(code, opener) {
	const out = []
	for (const match of code.matchAll(opener)) {
		let i = code.indexOf('{', match.index + match[0].length - 1)
		const start = i
		let depth = 0
		for (; i < code.length; i++) {
			if (code[i] === '{') depth++
			else if (code[i] === '}' && --depth === 0) break
		}
		out.push(code.slice(start, i + 1))
	}
	return out
}

/** Resolve a property's value: a number literal or a known constant. */
function propValue(objText, prop) {
	const m = objText.match(new RegExp(`\\b${prop}\\s*(?::\\s*([\\w.]+))?\\s*[,}\\n]`))
	if (!m) return undefined
	const expr = m[1] ?? prop // shorthand `{ tileSize }`
	if (/^\d+$/.test(expr)) return Number(expr)
	if (Object.hasOwn(KNOWN_CONSTANTS, expr)) return KNOWN_CONSTANTS[expr]
	return `unresolved: ${expr}`
}

describe('WMS tile size matches across renderers (#966)', { tags: ['@unit', '@wms'] }, () => {
	it('every Cesium WebMapServiceImageryProvider requests 512 px tiles', () => {
		const providers = SOURCES.flatMap(({ file, code }) =>
			objectArgs(code, /new\s+(?:Cesium\.)?WebMapServiceImageryProvider\s*\(\s*\{/g).map((obj) => ({
				file,
				tileWidth: propValue(obj, 'tileWidth'),
				tileHeight: propValue(obj, 'tileHeight'),
			}))
		)
		// Control: the sweep finds the known providers (landcover, wms,
		// floodwms, BackgroundMapBrowser), so it is not passing vacuously.
		expect(providers.length).toBeGreaterThanOrEqual(4)
		// A provider without tileWidth/tileHeight falls back to Cesium's 256.
		const off = providers.filter((p) => p.tileWidth !== EXPECTED || p.tileHeight !== EXPECTED)
		expect(off).toEqual([])
	})

	it('every deck.gl TileLayer uses 512 px tiles and requests GetMap at the same size', () => {
		const tileLayers = SOURCES.flatMap(({ file, code }) =>
			objectArgs(code, /new\s+TileLayer\s*\(\s*\{/g).map((obj) => {
				const getMap = objectArgs(obj, /buildWmsGetMapUrl\s*\(\s*\{/g)
				// No tileSize in the GetMap call means the helper default applies.
				const getMapSize = getMap.length
					? (propValue(getMap[0], 'tileSize') ?? helperDefaultSize())
					: 'no GetMap call'
				return { file, tileSize: propValue(obj, 'tileSize'), getMapSize }
			})
		)
		// Control: the deck.gl WMS underlay is found.
		expect(tileLayers.map((t) => t.file)).toContain('src/components/DeckGlGridView.vue')
		const off = tileLayers.filter((t) => t.tileSize !== EXPECTED || t.getMapSize !== EXPECTED)
		expect(off).toEqual([])
	})
})

function helperDefaultSize() {
	const url = buildWmsGetMapUrl({
		bbox: { west: 24.9, south: 60.1, east: 25.0, north: 60.2 },
		layers: 'x',
	})
	return Number(new URLSearchParams(url.split('?')[1]).get('width'))
}
