import { describe, expect, it, vi } from 'vitest'

// Real Cesium math (tests/setup.js mocks `cesium` globally).
vi.mock('@/services/cesiumProvider.js', async () => {
	const Cesium = await vi.importActual('cesium')
	return { getCesium: () => Cesium }
})

import { VTT_DATA_CENTER, VTT_FRAMED_MAX_HEIGHT_M } from '@/constants/vttFlood.ts'
import { flyToFloodExtent, isFloodExtentFramed } from '@/services/vttFloodCamera.js'

const RealCesium = await vi.importActual('cesium')

function flightViewer() {
	return {
		isDestroyed: () => false,
		camera: { flyToBoundingSphere: vi.fn() },
	}
}

/** The [sphere, options] of the single flight started on `viewer`. */
function flight(viewer) {
	expect(viewer.camera.flyToBoundingSphere).toHaveBeenCalledTimes(1)
	return viewer.camera.flyToBoundingSphere.mock.calls[0]
}

const deg = (rad) => RealCesium.Math.toDegrees(rad)

describe('flyToFloodExtent', () => {
	it('looks at the centre of the measured data extent, not north of it', () => {
		const viewer = flightViewer()
		expect(flyToFloodExtent({ viewer })).toBe(true)
		const [sphere] = flight(viewer)
		const centre = RealCesium.Cartographic.fromCartesian(sphere.center)
		expect(deg(centre.longitude)).toBeCloseTo(VTT_DATA_CENTER.longitude, 4)
		expect(deg(centre.latitude)).toBeCloseTo(VTT_DATA_CENTER.latitude, 4)
		// The extent is ~1.5 km × 1.4 km, so the sphere radius is ~1 km.
		expect(sphere.radius).toBeGreaterThan(900)
		expect(sphere.radius).toBeLessThan(1200)
	})

	it('flies to an oblique view with an auto-fitted range by default', () => {
		const viewer = flightViewer()
		flyToFloodExtent({ viewer })
		const [, options] = flight(viewer)
		expect(options.offset).toBeInstanceOf(RealCesium.HeadingPitchRange)
		expect(deg(options.offset.heading)).toBeCloseTo(0, 6)
		expect(deg(options.offset.pitch)).toBeCloseTo(-35, 6)
		expect(options.offset.range).toBe(0)
		expect(options.duration).toBeGreaterThan(0)
	})

	it('flies straight down for the top-down view', () => {
		const viewer = flightViewer()
		flyToFloodExtent({ viewer, view: 'topDown' })
		const [, options] = flight(viewer)
		expect(deg(options.offset.pitch)).toBeCloseTo(-90, 6)
	})

	it('falls back to the oblique view for an unknown view name', () => {
		const viewer = flightViewer()
		flyToFloodExtent({ viewer, view: /** @type {any} */ ('__proto__') })
		const [, options] = flight(viewer)
		expect(deg(options.offset.pitch)).toBeCloseTo(-35, 6)
	})

	it('does nothing without a live viewer', () => {
		const destroyed = { isDestroyed: () => true, camera: { flyToBoundingSphere: vi.fn() } }
		expect(flyToFloodExtent({ viewer: destroyed })).toBe(false)
		expect(destroyed.camera.flyToBoundingSphere).not.toHaveBeenCalled()
		expect(flyToFloodExtent({ viewer: null })).toBe(false)
	})
})

describe('isFloodExtentFramed', () => {
	const CANVAS = { clientWidth: 800, clientHeight: 600 }

	/** Viewer whose screen centre hits the ground at (lon, lat), or sky when null. */
	function viewerLookingAt({ height, lon, lat }) {
		const pickEllipsoid = vi.fn((/** @type {any} */ point) => {
			expect(point.x).toBe(CANVAS.clientWidth / 2)
			expect(point.y).toBe(CANVAS.clientHeight / 2)
			return lon === null ? undefined : RealCesium.Cartesian3.fromDegrees(lon, lat)
		})
		return {
			isDestroyed: () => false,
			scene: { canvas: CANVAS },
			camera: { positionCartographic: { height }, pickEllipsoid },
		}
	}

	it('is true when a low camera looks at the extent', () => {
		const viewer = viewerLookingAt({
			height: 1200,
			lon: VTT_DATA_CENTER.longitude,
			lat: VTT_DATA_CENTER.latitude,
		})
		expect(isFloodExtentFramed(viewer)).toBe(true)
	})

	it('is false when the camera looks at Roihuvuori', () => {
		expect(isFloodExtentFramed(viewerLookingAt({ height: 1200, lon: 25.0419, lat: 60.2001 }))).toBe(
			false
		)
	})

	it('is false from high above, even when looking at the extent', () => {
		const viewer = viewerLookingAt({
			height: VTT_FRAMED_MAX_HEIGHT_M + 1,
			lon: VTT_DATA_CENTER.longitude,
			lat: VTT_DATA_CENTER.latitude,
		})
		expect(isFloodExtentFramed(viewer)).toBe(false)
	})

	it('is false when the screen centre is sky', () => {
		expect(isFloodExtentFramed(viewerLookingAt({ height: 1200, lon: null, lat: null }))).toBe(false)
	})
})
