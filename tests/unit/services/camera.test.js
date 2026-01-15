import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Camera from '@/services/camera.js'
import { useGlobalStore } from '@/stores/globalStore.js'

// Mock Cesium additional methods - will be initialized in beforeEach
let mockFlyTo
let mockSetView
let mockZoomIn
let mockZoomOut
let mockPickEllipsoid
let mockViewer

// Mock Cesium module
vi.mock('cesium', () => ({
	Cartesian3: {
		fromDegrees: vi.fn((lon, lat, alt) => ({ x: lon, y: lat, z: alt })),
	},
	Math: {
		toRadians: vi.fn((degrees) => (degrees * Math.PI) / 180),
		toDegrees: vi.fn((radians) => (radians * 180) / Math.PI),
	},
	Cartesian2: vi.fn(function (x, y) {
		this.x = x
		this.y = y
	}),
	Cartographic: {
		fromCartesian: vi.fn((_cartesian) => ({
			longitude: 0.4,
			latitude: 1.0,
			height: 1000,
		})),
	},
}))

describe('Camera service', () => {
	let camera
	let store

	beforeEach(() => {
		setActivePinia(createPinia())
		vi.clearAllMocks()

		// Initialize fresh mocks for each test
		mockFlyTo = vi.fn()
		mockSetView = vi.fn()
		mockZoomIn = vi.fn()
		mockZoomOut = vi.fn()
		mockPickEllipsoid = vi.fn()

		mockViewer = {
			camera: {
				setView: mockSetView,
				flyTo: mockFlyTo,
				zoomIn: mockZoomIn,
				zoomOut: mockZoomOut,
				pickEllipsoid: mockPickEllipsoid,
				position: { x: 1000, y: 2000, z: 3000 },
				pitch: -0.5,
				roll: 0.0,
				heading: 0.0,
				positionCartographic: {
					longitude: 0.4,
					latitude: 1.0,
					height: 1000,
				},
			},
			scene: {
				camera: {
					positionCartographic: {
						longitude: 0.4,
						latitude: 1.0,
						height: 1000,
					},
				},
				globe: {
					ellipsoid: {},
				},
				canvas: {
					clientWidth: 800,
					clientHeight: 600,
				},
			},
			dataSources: {
				_dataSources: [],
			},
		}

		store = useGlobalStore()
		store.setCesiumViewer(mockViewer)

		camera = new Camera()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('constructor', () => {
		it('should initialize with correct properties', () => {
			expect(camera.store).toBeDefined()
			expect(camera.viewer).toStrictEqual(mockViewer)
			expect(camera.isRotated).toBe(false)
		})
	})

	describe('init', () => {
		it('should set initial camera view with correct parameters', () => {
			camera.init()

			expect(mockSetView).toHaveBeenCalledWith({
				destination: { x: 24.945, y: 60.17, z: 2800 },
				orientation: {
					heading: expect.any(Number),
					pitch: expect.any(Number),
					roll: 0,
				},
			})
		})
	})

	describe('switchTo2DView', () => {
		beforeEach(() => {
			store.setPostalCode('12345')

			const mockDataSource = {
				name: 'PostCodes',
				_entityCollection: {
					_entities: {
						_array: [
							{
								_properties: {
									_posno: { _value: '12345' },
									_center_x: { _value: 24.95 },
									_center_y: { _value: 60.17 },
								},
							},
						],
					},
				},
			}

			mockViewer.dataSources._dataSources = [mockDataSource]
		})

		it('should fly to postal code area in 2D view', () => {
			camera.switchTo2DView()

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: { x: 24.95, y: 60.17, z: 3500 },
				orientation: {
					heading: 0,
					pitch: expect.any(Number), // -90 degrees in radians
				},
				duration: 3,
			})
		})

		it('should handle missing postal code data source', () => {
			mockViewer.dataSources._dataSources = []
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			expect(() => camera.switchTo2DView()).not.toThrow()
			expect(mockFlyTo).not.toHaveBeenCalled()
			expect(consoleWarnSpy).toHaveBeenCalledWith('[Camera] PostCodes data source not found')

			consoleWarnSpy.mockRestore()
		})

		it('should handle postal code not found in entities', () => {
			store.setPostalCode('99999')
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			expect(() => camera.switchTo2DView()).not.toThrow()
			expect(mockFlyTo).not.toHaveBeenCalled()
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'[Camera] Postal code 99999 not found for 2D view'
			)

			consoleWarnSpy.mockRestore()
		})
	})

	describe('switchTo3DView', () => {
		beforeEach(() => {
			store.setPostalCode('12345')

			// Ensure camera.position has clone method
			mockViewer.camera.position.clone = vi.fn(() => ({ x: 100, y: 200, z: 300 }))

			const mockDataSource = {
				name: 'PostCodes',
				_entityCollection: {
					_entities: {
						_array: [
							{
								_properties: {
									_posno: { _value: '12345' },
									_center_x: { _value: 24.95 },
									_center_y: { _value: 60.17 },
								},
							},
						],
					},
				},
			}

			mockViewer.dataSources._dataSources = [mockDataSource]
		})

		it('should fly to postal code area in 3D view', () => {
			camera.switchTo3DView()

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: { x: 24.95, y: 60.145, z: 2000 }, // y - 0.025
				orientation: {
					heading: 0.0,
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
				duration: 3,
				complete: expect.any(Function),
				cancel: expect.any(Function),
			})
		})
	})

	describe('switchTo3DGrid', () => {
		it('should fly to default position when level is start', () => {
			store.setLevel('start')

			camera.switchTo3DGrid()

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: { x: 24.991745, y: 60.045, z: 12000 },
				orientation: {
					heading: 0.0,
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
				duration: 1,
			})
		})

		it('should preserve current position when level is not start', () => {
			store.setLevel('building')

			camera.switchTo3DGrid()

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: expect.any(Object),
				orientation: {
					heading: 0.0,
					pitch: expect.any(Number),
					roll: 0.0,
				},
				duration: 1,
			})

			expect(store.level).toBeNull()
		})
	})

	describe('flyCamera3D', () => {
		it('should fly camera to specified coordinates', () => {
			const lat = 25.0
			const lon = 60.0
			const z = 1000

			camera.flyCamera3D(lat, lon, z)

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: { x: lat, y: lon, z: z },
				orientation: {
					heading: 0.0,
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
				duration: 1,
			})
		})
	})

	describe('setCameraView', () => {
		it('should set camera view to specified coordinates', () => {
			const longitude = 24.95
			const latitude = 60.17

			camera.setCameraView(longitude, latitude)

			expect(mockSetView).toHaveBeenCalledWith({
				destination: { x: longitude, y: latitude - 0.0065, z: 500.0 },
				orientation: {
					heading: 0.0,
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
			})
		})
	})

	describe('zoom', () => {
		it('should zoom in when multiplier > 1', () => {
			camera.zoom(2)

			expect(mockZoomIn).toHaveBeenCalledWith(500) // 1000 * (1 - 1/2)
		})

		it('should zoom out when multiplier < 1', () => {
			camera.zoom(0.5)

			expect(mockZoomOut).toHaveBeenCalledWith(500) // 1000 * (1 - 0.5)
		})

		it('should handle multiplier of 1 (zoom out with 0)', () => {
			camera.zoom(1)

			expect(mockZoomOut).toHaveBeenCalledWith(0) // 1000 * (1 - 1)
		})
	})

	describe('setHeading', () => {
		it('should set camera heading to specified degrees', () => {
			const headingInDegrees = 90

			camera.setHeading(headingInDegrees)

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: mockViewer.camera.position,
				orientation: {
					heading: expect.any(Number), // 90 degrees in radians
					pitch: mockViewer.camera.pitch,
					roll: mockViewer.camera.roll,
				},
				duration: 1.0,
			})
		})

		it('should handle negative heading values', () => {
			camera.setHeading(-45)

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: mockViewer.camera.position,
				orientation: {
					heading: expect.any(Number), // -45 degrees in radians
					pitch: mockViewer.camera.pitch,
					roll: mockViewer.camera.roll,
				},
				duration: 1.0,
			})
		})
	})

	describe('resetNorth', () => {
		it('should reset camera orientation to north-facing', () => {
			camera.resetNorth()

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: mockViewer.camera.position,
				orientation: {
					heading: 0, // North
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
				duration: 1.0,
			})
		})
	})

	describe('rotate180Degrees', () => {
		beforeEach(() => {
			const mockCartesian = { x: 100, y: 200, z: 300 }
			mockPickEllipsoid.mockReturnValue(mockCartesian)
		})

		it('should rotate camera 180 degrees when not previously rotated', () => {
			store.isCameraRotated = false

			camera.rotate180Degrees()

			expect(mockSetView).toHaveBeenCalledWith({
				destination: expect.objectContaining({
					y: expect.any(Number), // latitude + 0.015
					z: 1200.0,
				}),
				orientation: {
					heading: Math.PI, // 180 degrees rotation
					pitch: expect.any(Number), // -35 degrees in radians
					roll: 0.0,
				},
			})

			expect(store.isCameraRotated).toBe(true)
		})

		it('should rotate camera 180 degrees when previously rotated', () => {
			store.isCameraRotated = true

			camera.rotate180Degrees()

			expect(mockSetView).toHaveBeenCalledWith({
				destination: expect.objectContaining({
					y: expect.any(Number), // latitude - 0.015
					z: 1200.0,
				}),
				orientation: {
					heading: Math.PI,
					pitch: expect.any(Number),
					roll: 0.0,
				},
			})

			expect(store.isCameraRotated).toBe(false)
		})

		it('should handle case when no ellipsoid point is found', () => {
			mockPickEllipsoid.mockReturnValue(null)
			const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

			camera.rotate180Degrees()

			expect(consoleSpy).toHaveBeenCalledWith(
				'[DEBUG]',
				'No ellipsoid point was found at the center of the screen.'
			)
			expect(mockSetView).not.toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe('edge cases', () => {
		it('should handle zero coordinates', () => {
			camera.flyCamera3D(0, 0, 0)

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: { x: 0, y: 0, z: 0 },
				orientation: expect.any(Object),
				duration: 1,
			})
		})

		it('should handle negative coordinates', () => {
			camera.setCameraView(-180, -90)

			expect(mockSetView).toHaveBeenCalledWith({
				destination: { x: -180, y: -90 - 0.0065, z: 500.0 },
				orientation: expect.any(Object),
			})
		})

		it('should handle extreme zoom values', () => {
			camera.zoom(100)
			expect(mockZoomIn).toHaveBeenCalledWith(990) // 1000 * (1 - 1/100)

			camera.zoom(0.01)
			expect(mockZoomOut).toHaveBeenCalledWith(990) // 1000 * (1 - 0.01)
		})

		it('should handle 360 degree heading', () => {
			camera.setHeading(360)

			expect(mockFlyTo).toHaveBeenCalledWith({
				destination: mockViewer.camera.position,
				orientation: {
					heading: expect.any(Number), // 360 degrees in radians
					pitch: mockViewer.camera.pitch,
					roll: mockViewer.camera.roll,
				},
				duration: 1.0,
			})
		})
	})

	/**
	 * Phase 2: Animation Control Tests
	 * Tests for camera flight cancellation, state capture/restoration
	 */
	describe('Phase 2: Animation Control', () => {
		beforeEach(() => {
			// Enhance mock with position clone capability
			mockViewer.camera.position = {
				x: 100,
				y: 200,
				z: 300,
				clone: vi.fn(() => ({ x: 100, y: 200, z: 300 })),
			}
		})

		describe('cancelFlight()', () => {
			it('should cancel active camera flight', () => {
				// Simulate an active flight
				camera.currentFlight = {
					cancelFlight: false,
				}
				camera.flightCancelRequested = false

				const result = camera.cancelFlight()

				expect(result).toBe(true)
				expect(camera.currentFlight.cancelFlight).toBe(true)
				expect(camera.flightCancelRequested).toBe(true)
			})

			it('should return false when no active flight', () => {
				camera.currentFlight = null

				const result = camera.cancelFlight()

				expect(result).toBe(false)
				expect(camera.flightCancelRequested).toBe(false)
			})

			it('should return false when cancellation already requested', () => {
				camera.currentFlight = {
					cancelFlight: false,
				}
				camera.flightCancelRequested = true

				const result = camera.cancelFlight()

				expect(result).toBe(false)
				expect(camera.currentFlight.cancelFlight).toBe(false)
			})

			it('should log cancellation request', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.currentFlight = {
					cancelFlight: false,
				}

				camera.cancelFlight()

				expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', '[Camera] Flight cancellation requested')

				consoleSpy.mockRestore()
			})

			it('should log when no flight to cancel', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.currentFlight = null
				camera.cancelFlight()

				expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', '[Camera] No active flight to cancel')

				consoleSpy.mockRestore()
			})
		})

		describe('captureCurrentState()', () => {
			it('should capture camera position and orientation', () => {
				camera.captureCurrentState()

				expect(camera.previousCameraState).toBeDefined()
				expect(camera.previousCameraState.position).toEqual({ x: 100, y: 200, z: 300 })
				expect(camera.previousCameraState.heading).toBe(mockViewer.camera.heading)
				expect(camera.previousCameraState.pitch).toBe(mockViewer.camera.pitch)
				expect(camera.previousCameraState.roll).toBe(mockViewer.camera.roll)
			})

			it('should call position.clone() to avoid reference issues', () => {
				camera.captureCurrentState()

				expect(mockViewer.camera.position.clone).toHaveBeenCalled()
			})

			it('should log state capture', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.captureCurrentState()

				expect(consoleSpy).toHaveBeenCalledWith(
					'[DEBUG]',
					'[Camera] Camera state captured for restoration'
				)

				consoleSpy.mockRestore()
			})

			it('should handle missing viewer gracefully', () => {
				const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

				camera.viewer = null
				camera.captureCurrentState()

				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'[Camera] Cannot capture camera state: Viewer not initialized'
				)
				expect(camera.previousCameraState).toBeNull()

				consoleWarnSpy.mockRestore()
			})

			it('should overwrite previous capture', () => {
				// First capture
				camera.captureCurrentState()
				const firstCapture = camera.previousCameraState

				// Modify camera
				mockViewer.camera.heading = 1.0

				// Second capture
				camera.captureCurrentState()
				const secondCapture = camera.previousCameraState

				expect(secondCapture).not.toBe(firstCapture)
				expect(secondCapture.heading).toBe(1.0)
			})
		})

		describe('restoreCapturedState()', () => {
			it('should restore previously captured camera state', () => {
				camera.previousCameraState = {
					position: { x: 50, y: 100, z: 150 },
					heading: 1.0,
					pitch: -1.0,
					roll: 0.5,
				}

				camera.restoreCapturedState()

				expect(mockSetView).toHaveBeenCalledWith({
					destination: { x: 50, y: 100, z: 150 },
					orientation: {
						heading: 1.0,
						pitch: -1.0,
						roll: 0.5,
					},
				})
			})

			it('should log state restoration', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.previousCameraState = {
					position: { x: 50, y: 100, z: 150 },
					heading: 1.0,
					pitch: -1.0,
					roll: 0.5,
				}

				camera.restoreCapturedState()

				expect(consoleSpy).toHaveBeenCalledWith(
					'[DEBUG]',
					'[Camera] Previous camera state restored'
				)

				consoleSpy.mockRestore()
			})

			it('should warn when no previous state exists', () => {
				const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

				camera.previousCameraState = null
				camera.restoreCapturedState()

				expect(consoleWarnSpy).toHaveBeenCalledWith('[Camera] No previous camera state to restore')
				expect(mockSetView).not.toHaveBeenCalled()

				consoleWarnSpy.mockRestore()
			})

			it('should warn when viewer not initialized', () => {
				const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

				camera.viewer = null
				camera.previousCameraState = {
					position: { x: 50, y: 100, z: 150 },
					heading: 1.0,
					pitch: -1.0,
					roll: 0.5,
				}

				camera.restoreCapturedState()

				expect(consoleWarnSpy).toHaveBeenCalledWith(
					'[Camera] Cannot restore camera state: Viewer not initialized'
				)

				consoleWarnSpy.mockRestore()
			})
		})

		describe('onFlightComplete()', () => {
			it('should reset flight tracking variables', () => {
				camera.currentFlight = { cancelFlight: false }
				camera.flightCancelRequested = true
				camera.previousCameraState = { position: {} }

				camera.onFlightComplete()

				expect(camera.currentFlight).toBeNull()
				expect(camera.flightCancelRequested).toBe(false)
				expect(camera.previousCameraState).toBeNull()
			})

			it('should log completion', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.onFlightComplete()

				expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', '[Camera] Flight completed')

				consoleSpy.mockRestore()
			})
		})

		describe('onFlightCancelled()', () => {
			it('should restore captured state on cancellation', () => {
				camera.previousCameraState = {
					position: { x: 10, y: 20, z: 30 },
					heading: 0.1,
					pitch: -0.2,
					roll: 0.0,
				}

				camera.onFlightCancelled()

				expect(mockSetView).toHaveBeenCalledWith({
					destination: { x: 10, y: 20, z: 30 },
					orientation: {
						heading: 0.1,
						pitch: -0.2,
						roll: 0.0,
					},
				})
			})

			it('should reset flight tracking variables', () => {
				camera.currentFlight = { cancelFlight: true }
				camera.flightCancelRequested = true

				camera.onFlightCancelled()

				expect(camera.currentFlight).toBeNull()
				expect(camera.flightCancelRequested).toBe(false)
			})

			it('should restore store view state', () => {
				const setViewStateSpy = vi.spyOn(store, 'restorePreviousViewState')
				const resetStateSpy = vi.spyOn(store, 'resetClickProcessingState')

				camera.onFlightCancelled()

				expect(setViewStateSpy).toHaveBeenCalled()
				expect(resetStateSpy).toHaveBeenCalled()

				setViewStateSpy.mockRestore()
				resetStateSpy.mockRestore()
			})

			it('should log cancellation', () => {
				const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

				camera.onFlightCancelled()

				expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', '[Camera] Flight cancelled')

				consoleSpy.mockRestore()
			})
		})

		describe('cancellation edge cases', () => {
			it('should handle rapid cancel requests', () => {
				camera.currentFlight = { cancelFlight: false }

				// First cancel
				camera.cancelFlight()
				expect(camera.flightCancelRequested).toBe(true)

				// Second cancel should be ignored
				const result = camera.cancelFlight()
				expect(result).toBe(false)
			})

			it('should handle cancellation when flight completes normally', () => {
				camera.currentFlight = { cancelFlight: false }
				camera.captureCurrentState()

				// Request cancellation
				camera.cancelFlight()

				// Flight completes normally
				camera.onFlightComplete()

				// State should be cleaned up
				expect(camera.currentFlight).toBeNull()
				expect(camera.flightCancelRequested).toBe(false)
				expect(camera.previousCameraState).toBeNull()
			})

			it('should maintain state isolation between instances', () => {
				const camera2 = new Camera()

				camera.currentFlight = { cancelFlight: false }
				camera.captureCurrentState()

				// Second instance should have independent state
				expect(camera2.currentFlight).toBeNull()
				expect(camera2.previousCameraState).toBeNull()
			})
		})

		describe('integration with globalStore', () => {
			it('should work with store captureViewState', () => {
				// Mock viewer with proper clone
				mockViewer.camera.position.clone = vi.fn(() => ({ x: 100, y: 200, z: 300 }))

				const storeCaptureSpy = vi.spyOn(store, 'captureViewState')

				// Simulate full workflow
				store.captureViewState()
				camera.captureCurrentState()

				expect(storeCaptureSpy).toHaveBeenCalled()
				expect(camera.previousCameraState).toBeDefined()

				storeCaptureSpy.mockRestore()
			})

			it('should coordinate state restoration', () => {
				// Set up both camera and store state
				camera.previousCameraState = {
					position: { x: 1, y: 2, z: 3 },
					heading: 0,
					pitch: 0,
					roll: 0,
				}

				store.clickProcessingState.previousViewState = {
					position: { x: 1, y: 2, z: 3 },
					orientation: { heading: 0, pitch: 0, roll: 0 },
					showBuildingInfo: true,
					buildingAddress: 'Test',
				}

				// Trigger cancellation
				camera.onFlightCancelled()

				// Both should restore
				expect(mockSetView).toHaveBeenCalled()
				expect(store.clickProcessingState.isProcessing).toBe(false)
			})
		})

		describe('performance and memory', () => {
			it('should clean up previous state on new capture', () => {
				// First capture
				camera.captureCurrentState()
				const firstState = camera.previousCameraState

				// Second capture should replace
				camera.captureCurrentState()

				expect(camera.previousCameraState).not.toBe(firstState)
			})

			it('should not leak references', () => {
				const originalX = mockViewer.camera.position.x

				camera.captureCurrentState()

				// Modify original
				mockViewer.camera.position.x = 999

				// Captured state should be independent due to clone
				expect(camera.previousCameraState.position.x).not.toBe(999)
				expect(camera.previousCameraState.position.x).toBe(originalX)

				// Restore for other tests
				mockViewer.camera.position.x = originalX
			})

			it('should handle repeated capture/restore cycles', () => {
				for (let i = 0; i < 10; i++) {
					camera.captureCurrentState()
					camera.restoreCapturedState()
				}

				// Should not accumulate state
				expect(camera.previousCameraState).toBeDefined()
			})
		})
	})
})
