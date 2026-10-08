import { describe, expect, it } from 'vitest'
import {
	VTT_CAMERA_VIEWS,
	VTT_DATA_CENTER,
	VTT_DATA_EXTENT,
	VTT_FRAME_COUNT,
	validateFrameNumber,
} from '@/constants/vttFlood.ts'

describe('VTT frame range', () => {
	// Upstream serves mesh2d_out_0..287 for scenarios 1–3; frame 288 is a 404
	// ("Tiedostoa ei löytynyt"), measured 2026-10-08.
	it('has 288 frames, 0..287', () => {
		expect(VTT_FRAME_COUNT).toBe(288)
	})

	it('accepts the last frame upstream serves', () => {
		expect(validateFrameNumber(287)).toBe(287)
		expect(validateFrameNumber(0)).toBe(0)
	})

	it('rejects the first frame upstream does not serve', () => {
		expect(() => validateFrameNumber(288)).toThrow(/Invalid VTT frame/)
	})

	it('rejects negative and fractional frames', () => {
		expect(() => validateFrameNumber(-1)).toThrow(/Invalid VTT frame/)
		expect(() => validateFrameNumber(1.5)).toThrow(/Invalid VTT frame/)
	})
})

describe('VTT data extent and camera views', () => {
	it('centres on the measured mesh bbox', () => {
		const { west, south, east, north } = VTT_DATA_EXTENT
		expect(VTT_DATA_CENTER.longitude).toBeCloseTo(25.05029, 4)
		expect(VTT_DATA_CENTER.latitude).toBeCloseTo(60.16763, 4)
		expect(VTT_DATA_CENTER.longitude).toBeGreaterThan(west)
		expect(VTT_DATA_CENTER.longitude).toBeLessThan(east)
		expect(VTT_DATA_CENTER.latitude).toBeGreaterThan(south)
		expect(VTT_DATA_CENTER.latitude).toBeLessThan(north)
	})

	it('tilts the oblique view enough to compare column heights', () => {
		expect(VTT_CAMERA_VIEWS.oblique.pitch).toBeGreaterThanOrEqual(-40)
		expect(VTT_CAMERA_VIEWS.oblique.pitch).toBeLessThanOrEqual(-30)
		expect(VTT_CAMERA_VIEWS.topDown.pitch).toBe(-90)
	})
})
