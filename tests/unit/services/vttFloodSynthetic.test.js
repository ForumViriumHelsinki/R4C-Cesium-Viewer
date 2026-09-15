import { describe, expect, it } from 'vitest'
import { VTT_DIMENSIONS, VTT_FRAME_COUNT } from '@/constants/vttFlood.ts'
import { generateSyntheticFrame } from '@/services/vttFloodSynthetic.js'

const maxDepth = (frame) =>
	Math.max(...frame.features.map((f) => f.properties.overland_water_depth))

describe('generateSyntheticFrame', () => {
	it('validates scenario and frame like the API path', () => {
		expect(() => generateSyntheticFrame({ scenarioId: '9', frameNumber: 0 })).toThrow(
			/Invalid VTT scenario/
		)
		expect(() => generateSyntheticFrame({ scenarioId: '1', frameNumber: VTT_FRAME_COUNT })).toThrow(
			/Invalid VTT frame/
		)
	})

	it('emits closed polygon cells carrying every dimension as a finite number', () => {
		const frame = generateSyntheticFrame({ scenarioId: '1', frameNumber: 0 })
		expect(frame.type).toBe('FeatureCollection')
		expect(frame.features.length).toBeGreaterThan(0)
		for (const feature of frame.features) {
			const ring = feature.geometry.coordinates[0]
			expect(ring[0]).toEqual(ring[ring.length - 1])
			for (const { key } of VTT_DIMENSIONS) {
				expect(Number.isFinite(feature.properties[key])).toBe(true)
			}
		}
	})

	it('is deterministic', () => {
		const a = generateSyntheticFrame({ scenarioId: '2', frameNumber: 100 })
		const b = generateSyntheticFrame({ scenarioId: '2', frameNumber: 100 })
		expect(a).toEqual(b)
	})

	it('varies spatially even at frame 0, so the colour ramp is not flat', () => {
		const frame = generateSyntheticFrame({ scenarioId: '1', frameNumber: 0 })
		for (const { key } of VTT_DIMENSIONS) {
			const values = new Set(frame.features.map((f) => f.properties[key]))
			expect(values.size).toBeGreaterThan(1)
		}
	})

	it('floods during the cloudburst and drains afterwards', () => {
		const start = maxDepth(generateSyntheticFrame({ scenarioId: '1', frameNumber: 0 }))
		const peak = maxDepth(generateSyntheticFrame({ scenarioId: '1', frameNumber: 24 }))
		const end = maxDepth(
			generateSyntheticFrame({ scenarioId: '1', frameNumber: VTT_FRAME_COUNT - 1 })
		)
		expect(peak).toBeGreaterThan(start * 10)
		expect(end).toBeLessThan(peak / 2)
	})

	it('produces different output per scenario', () => {
		const one = maxDepth(generateSyntheticFrame({ scenarioId: '1', frameNumber: 24 }))
		const three = maxDepth(generateSyntheticFrame({ scenarioId: '3', frameNumber: 24 }))
		expect(one).not.toBe(three)
	})
})
