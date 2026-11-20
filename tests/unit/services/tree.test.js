/**
 * Tree.loadTrees must reject when no tree category loaded. unifiedLoader.loadLayers
 * turns each layer's rejection into a fulfilled `{ error, config }` value, so
 * counting only `status === 'rejected'` treated a full outage as success.
 */

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Tree from '@/services/tree.js'
import unifiedLoader from '@/services/unifiedLoader.js'
import { useGlobalStore } from '@/stores/globalStore.js'

vi.mock('@/services/datasource.js', () => ({
	default: class {
		addDataSourceWithPolygonFix = vi.fn(async () => [])
	},
}))

describe('Tree.loadTrees failure reporting', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		useGlobalStore().setPostalCode('00100')
		vi.restoreAllMocks()
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	// Only fetch is stubbed, so a catch added anywhere in unifiedLoader or
	// progressiveLoader that swallowed the 503 would turn this green into red.
	it('rejects with the load error when every category returns 503', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }))
		vi.stubGlobal('fetch', fetchMock)

		try {
			await expect(new Tree().loadTrees()).rejects.toThrow('HTTP 503')
		} finally {
			vi.unstubAllGlobals()
		}
		expect(fetchMock).toHaveBeenCalled()
	})

	it('resolves when only some categories fail, so the loaded ones stay on the map', async () => {
		let call = 0
		vi.spyOn(unifiedLoader, 'loadLayer').mockImplementation(async () => {
			call += 1
			if (call === 1) throw new Error('HTTP 503 Service Unavailable')
			return []
		})

		const results = await new Tree().loadTrees()

		expect(results).toHaveLength(4)
	})

	it('resolves when every category loads', async () => {
		vi.spyOn(unifiedLoader, 'loadLayer').mockResolvedValue([])

		await expect(new Tree().loadTrees()).resolves.toHaveLength(4)
	})
})
