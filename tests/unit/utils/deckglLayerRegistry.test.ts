import { describe, expect, it, vi } from 'vitest'
import { createDeckLayerRegistry } from '@/utils/deckglLayerRegistry'

const ctx = { state: { ndvi: true, grid: false }, modules: {} }

describe('deckglLayerRegistry', () => {
	it('builds only the layers whose isActive predicate holds', () => {
		const registry = createDeckLayerRegistry()
		registry.register({
			id: 'ndvi',
			order: 10,
			isActive: (c) => c.state.ndvi,
			build: () => 'ndvi-layer',
		})
		registry.register({
			id: 'grid',
			order: 20,
			isActive: (c) => c.state.grid,
			build: () => 'grid-layer',
		})
		expect(registry.buildLayers(ctx)).toEqual(['ndvi-layer'])
	})

	it('orders layers bottom-to-top by `order`, independent of registration order', () => {
		const registry = createDeckLayerRegistry()
		registry.register({ id: 'top', order: 30, isActive: () => true, build: () => 'top' })
		registry.register({ id: 'bottom', order: 0, isActive: () => true, build: () => 'bottom' })
		registry.register({ id: 'mid', order: 10, isActive: () => true, build: () => 'mid' })
		expect(registry.buildLayers(ctx)).toEqual(['bottom', 'mid', 'top'])
	})

	it('flattens factories that return several layers and drops null results', () => {
		const registry = createDeckLayerRegistry()
		registry.register({ id: 'pair', order: 0, isActive: () => true, build: () => ['a', 'b'] })
		registry.register({ id: 'none', order: 1, isActive: () => true, build: () => null })
		expect(registry.buildLayers(ctx)).toEqual(['a', 'b'])
	})

	it('rejects duplicate ids so two factories cannot fight over one deck layer id', () => {
		const registry = createDeckLayerRegistry()
		const def = { id: 'dup', order: 0, isActive: () => true, build: () => 'x' }
		registry.register(def)
		expect(() => registry.register(def)).toThrow(/dup/)
	})

	it('isolates a throwing factory: other layers still build and the error is reported', () => {
		const onError = vi.fn()
		const registry = createDeckLayerRegistry({ onError })
		registry.register({
			id: 'broken',
			order: 0,
			isActive: () => true,
			build: () => {
				throw new Error('boom')
			},
		})
		registry.register({ id: 'ok', order: 1, isActive: () => true, build: () => 'ok' })
		expect(registry.buildLayers(ctx)).toEqual(['ok'])
		expect(onError).toHaveBeenCalledWith('broken', expect.any(Error))
	})

	it('lists registered ids so the UI can mark layers not yet ported to deck.gl', () => {
		const registry = createDeckLayerRegistry()
		registry.register({ id: 'grid', order: 0, isActive: () => true, build: () => 'g' })
		expect(registry.has('grid')).toBe(true)
		expect(registry.has('buildings')).toBe(false)
		expect(registry.ids()).toEqual(['grid'])
	})

	it('unregister removes a layer factory', () => {
		const registry = createDeckLayerRegistry()
		const unregister = registry.register({
			id: 'grid',
			order: 0,
			isActive: () => true,
			build: () => 'g',
		})
		unregister()
		expect(registry.buildLayers(ctx)).toEqual([])
	})
	it('collects the data URLs the active state asks for, once each, skipping nulls', () => {
		const registry = createDeckLayerRegistry()
		registry.register({
			id: 'a',
			order: 0,
			isActive: () => true,
			build: () => null,
			dataUrl: () => '/a.json',
		})
		registry.register({
			id: 'b',
			order: 1,
			isActive: () => true,
			build: () => null,
			dataUrl: () => null,
		})
		registry.register({
			id: 'c',
			order: 2,
			isActive: () => true,
			build: () => null,
			dataUrl: () => '/a.json',
		})
		registry.register({ id: 'd', order: 3, isActive: () => true, build: () => null })
		expect(registry.dataUrls(ctx.state)).toEqual(['/a.json'])
	})

	it('reports a dataUrl that throws and keeps collecting', () => {
		const onError = vi.fn()
		const registry = createDeckLayerRegistry({ onError })
		registry.register({
			id: 'bad',
			order: 0,
			isActive: () => true,
			build: () => null,
			dataUrl: () => {
				throw new Error('x')
			},
		})
		registry.register({
			id: 'ok',
			order: 1,
			isActive: () => true,
			build: () => null,
			dataUrl: () => '/ok.json',
		})
		expect(registry.dataUrls(ctx.state)).toEqual(['/ok.json'])
		expect(onError).toHaveBeenCalledWith('bad', expect.any(Error))
	})
})
