/**
 * Background preloads must feed a consumer (#972, same class as #755).
 *
 * backgroundPreloader.startCriticalPreload() used to fetch three payloads
 * (/paavo 796 KB, an untrimmed heatexposure_optimized sample 1.35 MB,
 * /hsy-action 317 KB) and store them under cache keys nothing reads. Every
 * consumer fetched the same data itself, so each preload was a duplicate
 * download at startup.
 *
 * (a) Every item startCriticalPreload() queues must be read by a consumer:
 *     its cache key appears in another src file, or its URL is built by the
 *     same builder the consumer calls (so the consumer's request can reuse it).
 * (b) Every pygeoapi `/items` URL literal in src carries a narrowing
 *     parameter, so no request pulls a whole collection.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/cacheService.js', () => ({
	default: { getData: vi.fn(async () => null), setData: vi.fn(async () => {}) },
}))
vi.mock('@/services/progressiveLoader.js', () => ({
	default: { loadData: vi.fn(async () => []) },
}))

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROOT, 'src')
const PRELOADER = 'src/services/backgroundPreloader.js'

const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) return walk(path)
		return /\.(js|ts|vue)$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
	})

// Comments do not read a cache key, so strip block comments and whole-line
// `//` comments before searching.
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const SOURCES = walk(SRC).map((path) => ({
	file: relative(ROOT, path),
	code: readFileSync(path, 'utf-8'),
}))

const isReadOutsidePreloader = (needle) =>
	SOURCES.some(({ file, code }) => file !== PRELOADER && stripComments(code).includes(needle))

// Items that no consumer reads by cache key, but whose request is the one
// the consumer makes, so the browser HTTP cache can serve it.
const SAME_REQUEST_AS_CONSUMER = {
	// tiffImagery.js loads urlStore.ndviTiffUrl(date); the preload builds the
	// same URL through the same getter.
	ndvi: (item, urlStore) => item.url === urlStore.ndviTiffUrl(item.date),
}

describe('backgroundPreloader preloads feed a consumer (#972)', { tags: ['@unit'] }, () => {
	let preloader
	let urlStore

	beforeEach(async () => {
		setActivePinia(createPinia())
		vi.resetModules()
		;({ default: preloader } = await import('@/services/backgroundPreloader.js'))
		const { useURLStore } = await import('@/stores/urlStore.js')
		urlStore = useURLStore()
		preloader.preloadQueue.clear()
		vi.spyOn(preloader, 'processPreloadQueue').mockResolvedValue(undefined)
	})

	it('every critical preload is read by a consumer', async () => {
		await preloader.startCriticalPreload()
		const queued = [...preloader.preloadQueue.values()]

		// Control: the queue is populated, so the check below is not vacuous.
		expect(queued.length).toBeGreaterThan(0)
		// Control: the search sees consumer code outside the preloader.
		expect(isReadOutsidePreloader('ndviTiffUrl(')).toBe(true)

		const unread = queued
			.filter((item) => !isReadOutsidePreloader(item.key))
			.filter((item) => !SAME_REQUEST_AS_CONSUMER[item.type]?.(item, urlStore))
			.map((item) => `${item.key} -> ${item.url}`)
		expect(unread).toEqual([])
	})
})

// A URL literal ending in `/items` or `/items?<query>`, in any quote style.
const ITEMS_URL = /['"`]([^'"`\n]*\/items(?:\?[^'"`\n]*)?)['"`]/g
const NARROWING =
	/[?&](bbox|postinumero|posno|grid_id|from_id|vtj_prt|koodi)=|[?&]limit=1(&|$)|[?&]skipGeometry=true/

// file -> exact URL literal -> why it is exempt. Exact match, so allowing a
// bare base URL does not also allow a query built on it.
const ITEMS_ALLOWLIST = {
	'src/stores/urlStore.js': {
		// Follow-up: deleted with its only caller, espooSurvey.js, in the
		// dead-analysis-removal PR (#980).
		'${state.pygeoapiBase}${collection}/items?f=json&limit=${limit}':
			'collectionUrl has no mounted consumer',
	},
	'src/services/backgroundPreloader.js': {
		// Follow-up: getLayerUrl serves only preloadPostalCodeData, which has no
		// callers, and its `filter=postalCode=` is not a pygeoapi parameter.
		'/pygeoapi/collections/trees/items': 'getLayerUrl is dead code',
		'/pygeoapi/collections/buildings/items': 'getLayerUrl is dead code',
		'/pygeoapi/collections/vegetation/items': 'getLayerUrl is dead code',
		'/pygeoapi/collections/heatexposure_optimized/items': 'getLayerUrl is dead code',
	},
}

describe('pygeoapi item URLs are narrowed (#972)', { tags: ['@unit'] }, () => {
	const found = SOURCES.flatMap(({ file, code }) =>
		[...code.matchAll(ITEMS_URL)].map(([, url]) => ({ file, url }))
	)

	it('the sweep sees the URL builders it guards', () => {
		// Control: urlStore's builders are template literals; if the matcher
		// stops recognising them, the check below passes vacuously.
		const urlStoreHits = found.filter(({ file }) => file === 'src/stores/urlStore.js')
		expect(urlStoreHits.length).toBeGreaterThanOrEqual(10)
	})

	it('every /items URL carries a narrowing parameter or is allowlisted', () => {
		const unbounded = found
			.filter(({ url }) => !NARROWING.test(url))
			.filter(
				({ file, url }) =>
					!Object.keys(ITEMS_ALLOWLIST[file] ?? {}).some((allowed) => url === allowed)
			)
			.map(({ file, url }) => `${file}: ${url}`)
		expect(unbounded).toEqual([])
	})
})
