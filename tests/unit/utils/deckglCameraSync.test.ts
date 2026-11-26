import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cesiumCameraToViewState } from '@/utils/deckglCamera'
import { createCameraSync } from '@/utils/deckglCameraSync'
import { applyCesiumCamera, readCesiumCamera } from '@/utils/deckglCesiumBridge'

const Cesium: any = await vi.importActual('cesium')
const viewport = { width: 1280, height: 800 }

/** Viewer stand-in: setView moves a real Cesium position and raises moveEnd, as a render would. */
function fakeViewer() {
	const listeners = new Set<() => void>()
	const camera: any = {
		position: Cesium.Cartesian3.fromDegrees(24.945, 60.17, 4000),
		heading: 0,
		pitch: -Math.PI / 2,
		moveEnd: {
			addEventListener: (fn: () => void) => {
				listeners.add(fn)
				return () => listeners.delete(fn)
			},
		},
	}
	camera.setView = ({ destination, orientation }: any) => {
		camera.position = destination
		camera.heading = orientation.heading
		camera.pitch = orientation.pitch
		for (const fn of listeners) fn()
	}
	return { camera, scene: { requestRender: vi.fn() }, listeners }
}

describe('createCameraSync', () => {
	let viewer: ReturnType<typeof fakeViewer>
	let onCesiumMove: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.useFakeTimers()
		viewer = fakeViewer()
		onCesiumMove = vi.fn()
	})
	afterEach(() => vi.useRealTimers())

	const make = () =>
		createCameraSync({ viewer, Cesium, getViewport: () => viewport, onCesiumMove, debounceMs: 200 })

	it('moves the hidden Cesium camera after deck settles, debounced', () => {
		const sync = make()
		sync.pushFromDeck({ longitude: 25.0, latitude: 60.2, zoom: 13, pitch: 0, bearing: 0 })
		sync.pushFromDeck({ longitude: 25.01, latitude: 60.21, zoom: 13, pitch: 0, bearing: 0 })
		expect(readCesiumCamera(viewer, Cesium)!.longitude).toBeCloseTo(24.945, 6)
		vi.advanceTimersByTime(200)
		expect(readCesiumCamera(viewer, Cesium)!.longitude).toBeCloseTo(25.01, 4)
		sync.dispose()
	})

	it('does not echo its own Cesium move back to deck', () => {
		const sync = make()
		sync.pushFromDeck({ longitude: 25.0, latitude: 60.2, zoom: 13, pitch: 0, bearing: 0 })
		vi.advanceTimersByTime(200)
		expect(onCesiumMove).not.toHaveBeenCalled()
		sync.dispose()
	})

	it('reports Cesium moves made elsewhere (search, zoom buttons, flyTo) as a deck viewState', () => {
		const sync = make()
		const cam = { longitude: 24.9, latitude: 60.25, altitude: 2500, heading: 30, pitch: -45 }
		applyCesiumCamera(viewer, Cesium, cam)
		expect(onCesiumMove).toHaveBeenCalledTimes(1)
		const vs = onCesiumMove.mock.calls[0][0]
		const expected = cesiumCameraToViewState(cam, viewport)
		expect(vs.longitude).toBeCloseTo(expected.longitude, 6)
		expect(vs.latitude).toBeCloseTo(expected.latitude, 6)
		expect(vs.zoom).toBeCloseTo(expected.zoom, 6)
		expect(vs.bearing).toBeCloseTo(30, 6)
		sync.dispose()
	})

	it('flushes a pending deck move on dispose and then stops listening', () => {
		const sync = make()
		sync.pushFromDeck({ longitude: 25.0, latitude: 60.2, zoom: 13, pitch: 0, bearing: 0 })
		sync.dispose()
		expect(readCesiumCamera(viewer, Cesium)!.longitude).toBeCloseTo(25.0, 4)
		expect(viewer.listeners.size).toBe(0)
		applyCesiumCamera(viewer, Cesium, {
			longitude: 24,
			latitude: 60,
			altitude: 3000,
			heading: 0,
			pitch: -90,
		})
		expect(onCesiumMove).not.toHaveBeenCalled()
	})

	it('is inert without a viewer', () => {
		const sync = createCameraSync({
			viewer: null,
			Cesium,
			getViewport: () => viewport,
			onCesiumMove,
		})
		expect(() => {
			sync.pushFromDeck({ longitude: 25, latitude: 60, zoom: 12, pitch: 0, bearing: 0 })
			vi.advanceTimersByTime(1000)
			sync.dispose()
		}).not.toThrow()
	})
})
