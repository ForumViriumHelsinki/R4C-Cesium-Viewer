import { describe, expect, it, vi } from 'vitest'
import { applyCesiumCamera, readCesiumCamera } from '@/utils/deckglCesiumBridge'

describe('deckglCesiumBridge', async () => {
	const Cesium: any = await vi.importActual('cesium')

	/** Viewer stand-in whose camera keeps what setView was given. */
	const fakeViewer = () => {
		const camera: any = { position: null, heading: 0, pitch: 0 }
		camera.setView = ({ destination, orientation }: any) => {
			camera.position = destination
			camera.heading = orientation.heading
			camera.pitch = orientation.pitch
		}
		return { camera, scene: { requestRender: vi.fn() } }
	}

	it('round-trips a camera through the Cesium viewer in degrees', () => {
		const viewer = fakeViewer()
		const input = { longitude: 24.945, latitude: 60.17, altitude: 4000, heading: 30, pitch: -35 }
		applyCesiumCamera(viewer, Cesium, input)
		const out = readCesiumCamera(viewer, Cesium)!
		expect(out.longitude).toBeCloseTo(input.longitude, 6)
		expect(out.latitude).toBeCloseTo(input.latitude, 6)
		expect(out.altitude).toBeCloseTo(input.altitude, 3)
		expect(out.heading).toBeCloseTo(input.heading, 6)
		expect(out.pitch).toBeCloseTo(input.pitch, 6)
		expect(viewer.scene.requestRender).toHaveBeenCalled()
	})

	it('returns null and does nothing without a viewer', () => {
		expect(readCesiumCamera(null, Cesium)).toBeNull()
		expect(() => applyCesiumCamera(null, Cesium, {} as any)).not.toThrow()
	})
})
