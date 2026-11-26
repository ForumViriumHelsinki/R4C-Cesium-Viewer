import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDCOVER_LAYER_NAMES, landcoverLayersForYear } from '@/constants/landcoverLayers'
import {
	BASE_MAP_LAYER,
	createImageryTileLayer,
	fetchTileBitmap,
	imageryLayerDefinition,
	selectImagerySpecs,
	xyzTileUrl,
} from '@/utils/deckglImagery'
import { WMS_TILE_SIZE } from '@/utils/deckglWms'

const urls = { helsinkiWMS: '/helsinki-wms?SERVICE=WMS&', wmsProxy: '/wms/proxy' }

const baseState = {
	urls,
	basicMap: 'default',
	landCover: false,
	hsyYear: 2024,
	hsyOverlayLayer: null,
	floodSelection: null,
}

const bbox = { west: 24.9, south: 60.1, east: 25.0, north: 60.2 }

describe('deckglImagery', () => {
	describe('selectImagerySpecs', () => {
		it('shows the Helsinki WMS base map by default', () => {
			expect(selectImagerySpecs(baseState)).toEqual([
				{ kind: 'wms', id: 'imagery-base', url: urls.helsinkiWMS, layers: BASE_MAP_LAYER },
			])
		})

		it('replaces the base map with an XYZ template for satellite and terrain', () => {
			const [sat] = selectImagerySpecs({ ...baseState, basicMap: 'satellite' })
			expect(sat).toMatchObject({ kind: 'xyz', id: 'imagery-base-satellite' })
			expect(sat.url).toContain('World_Imagery')
			const [topo] = selectImagerySpecs({ ...baseState, basicMap: 'terrain' })
			expect(topo).toMatchObject({ kind: 'xyz', id: 'imagery-base-terrain', maxZoom: 17 })
		})

		it('stacks base, land cover, HSY overlay and flood bottom to top', () => {
			const specs = selectImagerySpecs({
				...baseState,
				landCover: true,
				hsyYear: 2022,
				hsyOverlayLayer: 'asuminen_ja_maankaytto:foo',
				floodSelection: { id: 'coastal_2050', url: 'https://syke.example/wms?SERVICE=WMS' },
			})
			expect(specs.map((s) => s.id)).toEqual([
				'imagery-base',
				'imagery-landcover-2022',
				'imagery-hsy-asuminen_ja_maankaytto:foo',
				'imagery-flood-coastal_2050',
			])
			expect(specs[1]).toMatchObject({ url: '/wms/proxy', layers: landcoverLayersForYear(2022) })
			expect(specs[3]).toMatchObject({ layers: 'coastal_2050' })
		})

		it('keys land cover by year so a year change replaces the deck layer', () => {
			const a = selectImagerySpecs({ ...baseState, landCover: true, hsyYear: 2022 })
			const b = selectImagerySpecs({ ...baseState, landCover: true, hsyYear: 2024 })
			expect(a[1].id).not.toEqual(b[1].id)
		})
	})

	describe('tile URLs', () => {
		const tile = { bbox, index: { x: 0, y: 0, z: 0 } }
		class TileLayer {
			props: any
			constructor(props: any) {
				this.props = props
			}
		}
		const modules = { layers: { BitmapLayer: class {} }, geoLayers: { TileLayer } }
		let requested: string[]
		beforeEach(() => {
			requested = []
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string) => {
					requested.push(url)
					return { ok: true, blob: async () => new Blob() }
				})
			)
			vi.stubGlobal(
				'createImageBitmap',
				vi.fn(async () => 'bitmap')
			)
		})
		afterEach(() => vi.unstubAllGlobals())
		/** URL the layer's getTileData requests for one tile. */
		const urlFor = async (spec: any) => {
			await (createImageryTileLayer(spec, modules as any) as any).props.getTileData(tile)
			return requested.at(-1) as string
		}

		it('appends GetMap params to a base URL that already carries a query', async () => {
			const url = await urlFor({
				kind: 'wms',
				id: 'x',
				url: urls.helsinkiWMS,
				layers: BASE_MAP_LAYER,
			})
			expect(url.startsWith('/helsinki-wms?')).toBe(true)
			const params = new URL(url, 'http://localhost').searchParams
			expect(params.getAll('service')).toEqual(['WMS'])
			expect(params.has('SERVICE')).toBe(false)
			expect(params.get('request')).toBe('GetMap')
			expect(params.get('crs')).toBe('EPSG:3857')
			expect(params.get('layers')).toBe(BASE_MAP_LAYER)
			expect(params.get('width')).toBe(String(WMS_TILE_SIZE))
		})

		it('overrides format, keeps other base params on an absolute flood URL', async () => {
			const url = await urlFor({
				kind: 'wms',
				id: 'f',
				url: 'https://syke.example/wms?SERVICE=WMS&FORMAT=image/jpeg&map=tulva',
				layers: 'l',
			})
			const params = new URL(url).searchParams
			expect(params.has('FORMAT')).toBe(false)
			expect(params.get('format')).toBe('image/png')
			expect(params.get('transparent')).toBe('true')
			expect(params.get('map')).toBe('tulva')
		})

		it('requests XYZ tiles from the template filled with the tile index', async () => {
			const url = await urlFor({ kind: 'xyz', id: 's', url: 'https://t.example/{z}/{y}/{x}.png' })
			expect(url).toBe('https://t.example/0/0/0.png')
		})

		it('fills an XYZ template from the tile index', () => {
			expect(xyzTileUrl('https://t.example/{z}/{y}/{x}.png', { x: 3, y: 5, z: 7 })).toBe(
				'https://t.example/7/5/3.png'
			)
		})
	})

	describe('createImageryTileLayer', () => {
		// Minimal stand-ins for the deck modules: record constructor props.
		class TileLayer {
			props: any
			constructor(props: any) {
				this.props = props
			}
		}
		class BitmapLayer {
			props: any
			constructor(...props: any[]) {
				this.props = Object.assign({}, ...props)
			}
		}
		const modules = { layers: { BitmapLayer }, geoLayers: { TileLayer } }

		it('builds a TileLayer with the shared WMS tile size and the spec id', () => {
			const spec = {
				kind: 'wms',
				id: 'imagery-base',
				url: urls.helsinkiWMS,
				layers: BASE_MAP_LAYER,
			}
			const layer: any = createImageryTileLayer(spec as any, modules as any)
			expect(layer.props.id).toBe('imagery-base')
			expect(layer.props.tileSize).toBe(WMS_TILE_SIZE)
		})

		it('uses 256 px tiles and the spec maxZoom for XYZ templates', () => {
			const spec = { kind: 'xyz', id: 't', url: 'https://t/{z}/{x}/{y}.png', maxZoom: 17 }
			const layer: any = createImageryTileLayer(spec as any, modules as any)
			expect(layer.props.tileSize).toBe(256)
			expect(layer.props.maxZoom).toBe(17)
		})

		it('hands the decoded tile to BitmapLayer as image with data cleared (#1228)', () => {
			const spec = { kind: 'wms', id: 'w', url: '/wms/proxy', layers: 'l' }
			const layer: any = createImageryTileLayer(spec as any, modules as any)
			const tile = { bbox }
			const bitmap = { width: 512 }
			const sub = layer.props.renderSubLayers({ id: 'w-0', data: bitmap, tile })
			expect(sub.props.data).toBeNull()
			expect(sub.props.image).toBe(bitmap)
			expect(sub.props.bounds).toEqual([24.9, 60.1, 25.0, 60.2])
			expect(layer.props.renderSubLayers({ id: 'w-0', data: null, tile })).toBeNull()
		})
	})

	describe('imageryLayerDefinition', () => {
		it('registers below the vector layers and builds one deck layer per spec', () => {
			const built: string[] = []
			const modules = {
				layers: { BitmapLayer: class {} },
				geoLayers: {
					TileLayer: class {
						constructor(p: any) {
							built.push(p.id)
						}
					},
				},
			}
			expect(imageryLayerDefinition.order).toBeLessThan(100)
			const ctx = { state: { ...baseState, landCover: true }, modules }
			expect(imageryLayerDefinition.isActive(ctx as any)).toBe(true)
			imageryLayerDefinition.build(ctx as any)
			expect(built).toEqual(['imagery-base', 'imagery-landcover-2024'])
		})
	})

	it('land-cover constants list 13 classes and suffix the year', () => {
		expect(LANDCOVER_LAYER_NAMES).toHaveLength(13)
		expect(landcoverLayersForYear(2024).split(',')[0]).toBe(
			'asuminen_ja_maankaytto:maanpeite_avokalliot_2024'
		)
	})
})

describe('readImageryState', () => {
	it('reads the imagery selection from the stores the Cesium path writes', async () => {
		const { createPinia, setActivePinia } = await import('pinia')
		const { readImageryState } = await import('@/utils/deckglImagery')
		const { useBackgroundMapStore } = await import('@/stores/backgroundMapStore')
		const { useToggleStore } = await import('@/stores/toggleStore')
		const { useURLStore } = await import('@/stores/urlStore')
		setActivePinia(createPinia())
		const backgroundMapStore = useBackgroundMapStore()
		const toggleStore = useToggleStore()
		const urlStore = useURLStore()
		backgroundMapStore.setBasicMap('satellite')
		backgroundMapStore.setHSYOverlayLayer('a:b')
		backgroundMapStore.setFloodSelection({ id: 'f1', url: 'https://x/wms', extra: 1 })
		toggleStore.landCover = true

		const state = readImageryState({ toggleStore, backgroundMapStore, urlStore })
		expect(state).toEqual({
			urls: { helsinkiWMS: urlStore.helsinkiWMS, wmsProxy: urlStore.wmsProxy },
			basicMap: 'satellite',
			landCover: true,
			hsyYear: backgroundMapStore.hsyYear,
			hsyOverlayLayer: 'a:b',
			floodSelection: { id: 'f1', url: 'https://x/wms' },
		})

		backgroundMapStore.setHSYOverlayLayer('')
		backgroundMapStore.setFloodSelection(null)
		const cleared = readImageryState({ toggleStore, backgroundMapStore, urlStore })
		expect(cleared.hsyOverlayLayer).toBeNull()
		expect(cleared.floodSelection).toBeNull()
	})
})

describe('fetchTileBitmap', () => {
	const okResponse = () => ({ ok: true, blob: async () => new Blob() })

	beforeEach(async () => {
		const limiter = await import('@/services/hostConcurrencyLimiter')
		const breaker = await import('@/services/hostCircuitBreaker')
		limiter.__resetForTests()
		breaker.__resetForTests()
	})

	it('resolves only once the image is decoded, so the tile is not loaded early', async () => {
		let decoded = false
		const bitmap = await fetchTileBitmap('/wms/proxy?a', undefined, {
			fetchImpl: vi.fn(async () => okResponse()) as any,
			decode: async () => {
				decoded = true
				return 'bmp' as any
			},
		})
		expect(decoded).toBe(true)
		expect(bitmap).toBe('bmp')
	})

	it("passes deck's tile signal to fetch", async () => {
		const fetchImpl = vi.fn(async () => okResponse())
		const controller = new AbortController()
		await fetchTileBitmap('/wms/proxy?a', controller.signal, {
			fetchImpl: fetchImpl as any,
			decode: async () => 'bmp' as any,
		})
		expect((fetchImpl.mock.calls[0] as any)[1].signal).toBe(controller.signal)
	})

	it('does not fetch for a tile already aborted, and resolves null', async () => {
		const fetchImpl = vi.fn(async () => okResponse())
		const controller = new AbortController()
		controller.abort()
		const result = await fetchTileBitmap('/wms/proxy?a', controller.signal, {
			fetchImpl: fetchImpl as any,
		})
		expect(result).toBeNull()
		expect(fetchImpl).not.toHaveBeenCalled()
	})

	it('resolves null when the tile is aborted mid-request and frees its host slot', async () => {
		const { inspectLimiter } = await import('@/services/hostConcurrencyLimiter')
		const controller = new AbortController()
		const fetchImpl = vi.fn(async (_url: string, { signal }: any) => {
			controller.abort()
			throw Object.assign(new Error('aborted'), { name: 'AbortError', signal })
		})
		const result = await fetchTileBitmap('/wms/proxy?a', controller.signal, {
			fetchImpl: fetchImpl as any,
		})
		expect(result).toBeNull()
		expect(inspectLimiter().wms.active).toBe(0)
	})

	it('rejects on an HTTP error and records the failure for the host breaker', async () => {
		const { inspectBreaker } = await import('@/services/hostCircuitBreaker')
		await expect(
			fetchTileBitmap('/wms/proxy?a', undefined, {
				fetchImpl: vi.fn(async () => ({ ok: false, status: 504 })) as any,
			})
		).rejects.toThrow(/504/)
		expect(inspectBreaker().wms.failures).toBe(1)
	})
})
