import { describe, expect, it } from 'vitest'
import { POSTAL_CODE_SOURCES } from '@/constants/postalCodeLayers'
import { gridLayerDefinition } from '@/utils/deckglGridLayer'
import { postalCodeLayerDefinition, selectPostalCodeSource } from '@/utils/deckglPostalCodeLayer'

class GeoJsonLayer {
	props: any
	constructor(props: any) {
		this.props = props
	}
}
const modules = { layers: { GeoJsonLayer } }
const fc = { type: 'FeatureCollection', features: [] }
const { capitalRegion, helsinki } = POSTAL_CODE_SOURCES

const stateFor = (level: string, helsinkiView: boolean, geojson: Record<string, unknown> = {}) => ({
	postalCodes: { level, helsinkiView },
	geojson,
})

describe('selectPostalCodeSource (mirrors where Cesium loads the PostCodes data source)', () => {
	it('shows the capital-region areas at the start level, in any view', () => {
		expect(selectPostalCodeSource({ level: 'start', helsinkiView: false })).toBe(capitalRegion)
		expect(selectPostalCodeSource({ level: 'start', helsinkiView: true })).toBe(capitalRegion)
	})

	it('shows the Helsinki outlines below the start level in the Helsinki view', () => {
		expect(selectPostalCodeSource({ level: 'postalCode', helsinkiView: true })).toBe(helsinki)
		expect(selectPostalCodeSource({ level: 'building', helsinkiView: true })).toBe(helsinki)
	})

	it('shows none below the start level in the capital-region view', () => {
		expect(selectPostalCodeSource({ level: 'postalCode', helsinkiView: false })).toBeNull()
		expect(selectPostalCodeSource({ level: 'building', helsinkiView: false })).toBeNull()
	})
})

describe('postalCodeLayerDefinition', () => {
	it('asks for the selected source and is active once it has loaded', () => {
		const state = stateFor('start', false)
		expect(postalCodeLayerDefinition.dataUrl(state)).toBe(capitalRegion.url)
		expect(postalCodeLayerDefinition.isActive({ state, modules })).toBe(false)
		const loaded = stateFor('start', false, { [capitalRegion.url]: fc })
		expect(postalCodeLayerDefinition.isActive({ state: loaded, modules })).toBe(true)
		expect(postalCodeLayerDefinition.dataUrl(stateFor('postalCode', false))).toBeNull()
	})

	it('does not draw data left over from another source', () => {
		const state = stateFor('postalCode', true, { [capitalRegion.url]: fc })
		expect(postalCodeLayerDefinition.isActive({ state, modules })).toBe(false)
	})

	it('fills with the Cesium grey at the source opacity and outlines in black', () => {
		const layer: any = postalCodeLayerDefinition.build({
			state: stateFor('start', false, { [capitalRegion.url]: fc }),
			modules,
		})
		expect(layer.props.id).toBe('postal-codes')
		expect(layer.props.data).toBe(fc)
		expect(layer.props.getFillColor).toEqual([77, 77, 77, Math.round(0.2 * 255)])
		expect(layer.props.getLineColor).toEqual([0, 0, 0, 255])

		const outlines: any = postalCodeLayerDefinition.build({
			state: stateFor('postalCode', true, { [helsinki.url]: fc }),
			modules,
		})
		expect(outlines.props.filled).toBe(false)
	})

	it('sits between the imagery and the grid', () => {
		expect(postalCodeLayerDefinition.order).toBeGreaterThan(0)
		expect(postalCodeLayerDefinition.order).toBeLessThan(gridLayerDefinition.order)
	})
})
