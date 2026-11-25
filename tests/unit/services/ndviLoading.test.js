/**
 * @file NDVI GeoTIFF loading (#1083)
 * @tag @unit
 *
 * - Startup no longer preloads NDVI. The preloader built a provider per date,
 *   threw it away and kept only a cache key nothing read, so the four recent
 *   dates (about 99 MB) were reused only if the browser's one-hour HTTP cache
 *   still held them when the user opened that date.
 * - changeTIFF passes the NDVI value domain. Without it the provider reads the
 *   whole raster on the main thread to find the band's min and max.
 */

import { createPinia, setActivePinia } from 'pinia'
import TIFFImageryProvider from 'tiff-imagery-provider'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('tiff-imagery-provider', () => ({ default: { fromUrl: vi.fn() } }))
vi.mock('@/services/cacheService.js', () => ({
	default: { getData: vi.fn(async () => null), setData: vi.fn(async () => {}) },
}))

describe('NDVI loading (#1083)', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.mocked(TIFFImageryProvider.fromUrl).mockReset()
	})

	it('startup preloads no NDVI GeoTIFF', async () => {
		const { default: preloader } = await import('@/services/backgroundPreloader.js')
		preloader.preloadQueue.clear()
		vi.spyOn(preloader, 'processPreloadQueue').mockResolvedValue(undefined)

		await preloader.startCriticalPreload()

		const queued = [...preloader.preloadQueue.values()]
		expect(queued.filter((item) => item.type === 'ndvi' || /\.tiff?$/.test(item.url))).toEqual([])
		expect(TIFFImageryProvider.fromUrl).not.toHaveBeenCalled()
	})

	it('passes the NDVI value domain so the provider skips the min/max scan', async () => {
		vi.mocked(TIFFImageryProvider.fromUrl).mockResolvedValue({ readyPromise: Promise.resolve() })
		const { useGlobalStore } = await import('@/stores/globalStore.js')
		useGlobalStore().setCesiumViewer({
			imageryLayers: { contains: () => false, addImageryProvider: () => ({}) },
		})
		const { changeTIFF } = await import('@/services/tiffImagery.js')

		await changeTIFF()

		expect(TIFFImageryProvider.fromUrl).toHaveBeenCalledTimes(1)
		const [, options] = vi.mocked(TIFFImageryProvider.fromUrl).mock.calls[0]
		expect(options.renderOptions.single.domain).toEqual([-1, 1])
	})
})
