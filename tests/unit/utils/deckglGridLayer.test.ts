import { describe, expect, it } from 'vitest'
import { GRID_ALPHA, GRID_URL, gridLayerDefinition } from '@/utils/deckglGridLayer'
import { getGridFillColorRgba } from '@/utils/gridColorMapping'

class GeoJsonLayer {
	props: any
	constructor(props: any) {
		this.props = props
	}
}
const modules = { layers: { GeoJsonLayer } }
const data = { type: 'FeatureCollection', features: [] }

const stateFor = (visible: boolean, statsIndex: string, loaded: boolean) => ({
	grid: { visible, statsIndex },
	geojson: loaded ? { [GRID_URL]: data } : {},
})
const ctxFor = (state: any) => ({ state, modules })

describe('deckglGridLayer', () => {
	it('asks for the grid data only while the grid is on', () => {
		expect(gridLayerDefinition.dataUrl(stateFor(true, 'heat_index', false))).toBe(GRID_URL)
		expect(gridLayerDefinition.dataUrl(stateFor(false, 'heat_index', false))).toBeNull()
	})

	it('is active only when the grid is on and its data has loaded', () => {
		expect(gridLayerDefinition.isActive(ctxFor(stateFor(true, 'heat_index', true)))).toBe(true)
		expect(gridLayerDefinition.isActive(ctxFor(stateFor(false, 'heat_index', true)))).toBe(false)
		expect(gridLayerDefinition.isActive(ctxFor(stateFor(true, 'heat_index', false)))).toBe(false)
	})

	it('sits above the imagery layers', () => {
		expect(gridLayerDefinition.order).toBeGreaterThan(0)
	})

	it('colours cells with the shared grid palette and recolours on index change', () => {
		const layer: any = gridLayerDefinition.build(ctxFor(stateFor(true, 'green', true)))
		expect(layer.props.id).toBe('stats-grid')
		expect(layer.props.data).toBe(data)
		const props = { green: 0.4 }
		expect(layer.props.getFillColor({ properties: props })).toEqual(
			getGridFillColorRgba(props, 'green', GRID_ALPHA)
		)
		expect(layer.props.updateTriggers.getFillColor).toEqual(['green'])
	})
})
