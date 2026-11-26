import { describe, expect, it } from 'vitest'
import { cesiumCameraToViewState, viewStateToCesiumCamera } from '@/utils/deckglCamera'

const HELSINKI = { longitude: 24.945, latitude: 60.17 }

describe('deckglCamera', () => {
	describe('cesiumCameraToViewState', () => {
		it('maps a top-down camera to deck pitch 0 centred under the eye', () => {
			const vs = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: -90 })
			expect(vs.pitch).toBeCloseTo(0, 6)
			expect(vs.bearing).toBeCloseTo(0, 6)
			expect(vs.longitude).toBeCloseTo(HELSINKI.longitude, 6)
			expect(vs.latitude).toBeCloseTo(HELSINKI.latitude, 6)
		})

		it('zooms in one level when altitude halves', () => {
			const far = cesiumCameraToViewState({ ...HELSINKI, altitude: 8000, heading: 0, pitch: -90 })
			const near = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: -90 })
			expect(near.zoom - far.zoom).toBeCloseTo(1, 6)
		})

		it('gives a city-scale zoom for the 4 km default altitude', () => {
			const vs = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: -90 })
			expect(vs.zoom).toBeGreaterThan(12)
			expect(vs.zoom).toBeLessThan(15)
		})

		it('moves the look-at target ahead of a pitched camera along its heading', () => {
			// Heading 0 = north: target lies north of the eye.
			const north = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: -45 })
			expect(north.latitude).toBeGreaterThan(HELSINKI.latitude)
			expect(north.longitude).toBeCloseTo(HELSINKI.longitude, 6)
			expect(north.pitch).toBeCloseTo(45, 6)

			// Heading 90 = east: target lies east of the eye.
			const east = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 90, pitch: -45 })
			expect(east.longitude).toBeGreaterThan(HELSINKI.longitude)
			expect(east.latitude).toBeCloseTo(HELSINKI.latitude, 6)
			expect(east.bearing).toBeCloseTo(90, 6)
		})

		it('puts the target at the ground point of the view ray (ground truth)', () => {
			// Heading 0, pitch -45°, 4000 m up: the ray meets the ground 4000 m north.
			const vs = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: -45 })
			expect(vs.latitude - HELSINKI.latitude).toBeCloseTo(0.03593, 5)
			expect(vs.longitude).toBeCloseTo(HELSINKI.longitude, 9)
		})

		it('keeps the target on the true view ray when the pitch exceeds deck maxPitch', () => {
			// Pitch -20° at 1000 m: ground point 1000 / tan 20° ≈ 2747 m ahead.
			const vs = cesiumCameraToViewState({ ...HELSINKI, altitude: 1000, heading: 0, pitch: -20 })
			const groundMeters = ((vs.latitude - HELSINKI.latitude) * Math.PI * 6378137) / 180
			expect(groundMeters).toBeCloseTo(1000 / Math.tan((20 * Math.PI) / 180), 0)
			expect(vs.pitch).toBe(60)
		})

		it('falls back to deck maxPitch for a ray at or above the horizon', () => {
			const vs = cesiumCameraToViewState({ ...HELSINKI, altitude: 4000, heading: 0, pitch: 5 })
			expect(vs.pitch).toBe(60)
			expect(Number.isFinite(vs.latitude)).toBe(true)
			expect(Number.isFinite(vs.zoom)).toBe(true)
		})
	})

	describe('viewStateToCesiumCamera', () => {
		it.each([
			{ altitude: 4000, heading: 0, pitch: -90 },
			{ altitude: 2500, heading: 30, pitch: -35 },
			{ altitude: 12000, heading: 270, pitch: -60 },
		])('round-trips a Cesium camera through deck viewState (%o)', (cam) => {
			const input = { ...HELSINKI, ...cam }
			const back = viewStateToCesiumCamera(cesiumCameraToViewState(input))
			expect(back.longitude).toBeCloseTo(input.longitude, 5)
			expect(back.latitude).toBeCloseTo(input.latitude, 5)
			expect(back.altitude).toBeCloseTo(input.altitude, 0)
			expect(back.heading).toBeCloseTo(input.heading, 5)
			expect(back.pitch).toBeCloseTo(input.pitch, 5)
		})

		it('normalises negative deck bearings to a 0..360 heading', () => {
			const cam = viewStateToCesiumCamera({ ...HELSINKI, zoom: 13, pitch: 0, bearing: -90 })
			expect(cam.heading).toBeCloseTo(270, 6)
		})
	})
})
