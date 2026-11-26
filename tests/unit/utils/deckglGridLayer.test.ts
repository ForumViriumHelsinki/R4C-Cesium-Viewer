import { describe, expect, it } from 'vitest'
import { GRID_ALPHA, gridLayerDefinition } from '@/utils/deckglGridLayer'
import { getGridFillColorRgba } from '@/utils/gridColorMapping'

class GeoJsonLayer {
	props: any
	constructor(props: any) {
		this.props = props
	}
}
const modules = { layers: { GeoJsonLayer } }
const data = { type: 'FeatureCollection', features: [] }

const ctxFor = (grid: any) => ({ state: { grid }, modules })

describe('deckglGridLayer', () => {
	it('is active only when the grid is on and its data has loaded', () => {
		expect(
			gridLayerDefinition.isActive(ctxFor({ visible: true, statsIndex: 'heat_index', data }) as any)
		).toBe(true)
		expect(
			gridLayerDefinition.isActive(
				ctxFor({ visible: false, statsIndex: 'heat_index', data }) as any
			)
		).toBe(false)
		expect(
			gridLayerDefinition.isActive(
				ctxFor({ visible: true, statsIndex: 'heat_index', data: null }) as any
			)
		).toBe(false)
	})

	it('sits above the imagery layers', () => {
		expect(gridLayerDefinition.order).toBeGreaterThan(0)
	})

	it('colours cells with the shared grid palette and recolours on index change', () => {
		const layer: any = gridLayerDefinition.build(
			ctxFor({ visible: true, statsIndex: 'green', data }) as any
		)
		expect(layer.props.id).toBe('stats-grid')
		expect(layer.props.data).toBe(data)
		const props = { green: 0.4 }
		expect(layer.props.getFillColor({ properties: props })).toEqual(
			getGridFillColorRgba(props, 'green', GRID_ALPHA)
		)
		expect(layer.props.updateTriggers.getFillColor).toEqual(['green'])
	})
})
