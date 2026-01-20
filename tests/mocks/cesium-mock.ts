/**
 * Cesium Mock for Testing
 *
 * This mock provides a lightweight implementation of Cesium's API
 * for testing purposes, avoiding WebGL initialization issues in CI.
 * It simulates the core Cesium functionality needed by the application
 * without requiring actual 3D rendering.
 */

export function createCesiumMock() {
	// Mock entity collection
	class MockEntityCollection {
		_entities = { _array: [] }
		values = []

		add(entity: any) {
			this.values.push(entity)
			this._entities._array.push(entity)
			return entity
		}

		remove(entity: any) {
			const index = this.values.indexOf(entity)
			if (index > -1) {
				this.values.splice(index, 1)
			}
			const arrayIndex = this._entities._array.indexOf(entity)
			if (arrayIndex > -1) {
				this._entities._array.splice(arrayIndex, 1)
			}
			return true
		}

		removeAll() {
			this.values = []
			this._entities._array = []
		}

		getById(id: string) {
			return this.values.find((e: any) => e.id === id)
		}
	}

	// Mock data source collection
	class MockDataSourceCollection {
		_dataSources: any[] = []

		add(dataSource: any) {
			this._dataSources.push(dataSource)
			return Promise.resolve(dataSource)
		}

		remove(dataSource: any) {
			const index = this._dataSources.indexOf(dataSource)
			if (index > -1) {
				this._dataSources.splice(index, 1)
			}
			return true
		}

		getByName(name: string) {
			return this._dataSources.filter((ds) => ds.name === name)
		}

		get length() {
			return this._dataSources.length
		}
	}

	// Mock camera
	class MockCamera {
		position = { x: 0, y: 0, z: 1000000 }
		direction = { x: 0, y: 0, z: -1 }
		up = { x: 0, y: 1, z: 0 }
		right = { x: 1, y: 0, z: 0 }
		frustum = {
			fov: Math.PI / 3,
			aspectRatio: 1,
			near: 1,
			far: 10000000,
		}
		positionCartographic = {
			longitude: 0.4366,
			latitude: 1.0472,
			height: 1000000,
		}
		heading = 0
		pitch = -Math.PI / 2
		roll = 0

		setView(options: any) {
			if (options.destination) {
				this.position = options.destination
			}
			if (options.orientation) {
				if (options.orientation.heading !== undefined) this.heading = options.orientation.heading
				if (options.orientation.pitch !== undefined) this.pitch = options.orientation.pitch
				if (options.orientation.roll !== undefined) this.roll = options.orientation.roll
			}
		}

		flyTo(options: any) {
			this.setView(options)
			return Promise.resolve()
		}

		zoomIn(amount?: number) {
			this.positionCartographic.height -= amount || 100000
		}

		zoomOut(amount?: number) {
			this.positionCartographic.height += amount || 100000
		}

		lookAt(_target: any, _offset: any) {
			// Mock implementation
		}

		flyToBoundingSphere(_boundingSphere: any, _options?: any) {
			return Promise.resolve()
		}
	}

	// Mock scene
	class MockScene {
		canvas = document.createElement('canvas')
		camera = new MockCamera()
		globe = {
			enableLighting: false,
			showGroundAtmosphere: false,
			showWaterEffect: false,
			depthTestAgainstTerrain: false,
			show: true,
			baseColor: { red: 1, green: 1, blue: 1, alpha: 1 },
		}
		primitives = {
			add: () => ({}),
			remove: () => true,
			removeAll: () => {},
		}
		skyBox = { show: false }
		sun = { show: false }
		moon = { show: false }
		requestRenderMode = false
		maximumRenderTimeChange = Infinity
		debugShowFramesPerSecond = false
		frameState = {
			creditDisplay: {
				_currentFrameCredits: { screenCredits: [] },
			},
			passes: {
				render: true,
			},
		}

		constructor() {
			// Set canvas dimensions for tests
			Object.defineProperty(this.canvas, 'offsetWidth', {
				value: 800,
				writable: true,
			})
			Object.defineProperty(this.canvas, 'offsetHeight', {
				value: 600,
				writable: true,
			})
			this.canvas.classList.add('cesium-widget-canvas')
		}

		pick(windowPosition: any) {
			// Return a mock picked object for testing
			return {
				id: { id: 'mock-entity-1', name: 'Mock Entity' },
				primitive: {},
				position: windowPosition,
			}
		}

		drillPick(windowPosition: any) {
			return [this.pick(windowPosition)]
		}

		requestRender() {
			// Mock render request
		}

		render() {
			// Mock render
		}
	}

	// Mock viewer
	class MockViewer {
		container: HTMLElement
		scene = new MockScene()
		camera = this.scene.camera
		canvas = this.scene.canvas
		entities = new MockEntityCollection()
		dataSources = new MockDataSourceCollection()
		clock = {
			currentTime: { dayNumber: 2458119, secondsOfDay: 0 },
			startTime: { dayNumber: 2458119, secondsOfDay: 0 },
			stopTime: { dayNumber: 2458120, secondsOfDay: 0 },
			shouldAnimate: false,
			multiplier: 1,
		}
		imageryLayers = {
			addImageryProvider: () => ({}),
			remove: () => true,
			removeAll: () => {},
		}
		terrainProvider = {}
		cesiumWidget = {
			creditContainer: document.createElement('div'),
		}
		selectedEntity = null
		trackedEntity = null
		screenSpaceEventHandler = {
			setInputAction: () => {},
			removeInputAction: () => {},
			destroy: () => {},
		}

		constructor(container: string | HTMLElement, _options?: any) {
			if (typeof container === 'string') {
				this.container = document.getElementById(container) || document.createElement('div')
			} else {
				this.container = container
			}

			// Append canvas to container
			this.container.appendChild(this.canvas)

			// Store reference globally
			;(window as any).viewer = this
		}

		destroy() {
			if (this.container && this.canvas && this.canvas.parentNode) {
				this.canvas.parentNode.removeChild(this.canvas)
			}
			this.entities.removeAll()
			this.dataSources._dataSources = []
			if ((window as any).viewer === this) {
				delete (window as any).viewer
			}
		}

		zoomTo(_target: any, _offset?: any) {
			return Promise.resolve()
		}

		flyTo(_target: any, _options?: any) {
			return Promise.resolve()
		}

		resize() {
			// Mock resize
		}
	}

	// Mock Cartesian3
	class MockCartesian3 {
		x: number
		y: number
		z: number

		constructor(x = 0, y = 0, z = 0) {
			this.x = x
			this.y = y
			this.z = z
		}

		static fromDegrees(longitude: number, latitude: number, height = 0) {
			return new MockCartesian3(longitude, latitude, height)
		}

		static fromRadians(longitude: number, latitude: number, height = 0) {
			return new MockCartesian3(longitude, latitude, height)
		}

		static ZERO = new MockCartesian3(0, 0, 0)
	}

	// Mock Color
	class MockColor {
		red: number
		green: number
		blue: number
		alpha: number

		constructor(red = 1, green = 1, blue = 1, alpha = 1) {
			this.red = red
			this.green = green
			this.blue = blue
			this.alpha = alpha
		}

		static WHITE = new MockColor(1, 1, 1, 1)
		static BLACK = new MockColor(0, 0, 0, 1)
		static RED = new MockColor(1, 0, 0, 1)
		static GREEN = new MockColor(0, 1, 0, 1)
		static BLUE = new MockColor(0, 0, 1, 1)
		static TRANSPARENT = new MockColor(1, 1, 1, 0)

		static fromCssColorString(_color: string) {
			return new MockColor()
		}
	}

	// Mock GeoJsonDataSource
	class MockGeoJsonDataSource {
		name = ''
		entities = new MockEntityCollection()

		static load(_data: any, options?: any) {
			const dataSource = new MockGeoJsonDataSource()
			if (options?.clampToGround) {
				// Mock clamp to ground behavior
			}
			return Promise.resolve(dataSource)
		}
	}

	// Mock other required classes
	const MockEllipsoidTerrainProvider = class {}

	const MockFeatureDetection = {
		supportsWebGL: () => true,
		supportsImageRenderingPixelated: () => true,
	}

	const MockShadowMode = {
		DISABLED: 0,
		ENABLED: 1,
		CAST_ONLY: 2,
		RECEIVE_ONLY: 3,
	}

	const MockScreenSpaceEventType = {
		LEFT_CLICK: 0,
		LEFT_DOUBLE_CLICK: 1,
		LEFT_DOWN: 2,
		LEFT_UP: 3,
		MOUSE_MOVE: 4,
		RIGHT_CLICK: 5,
		RIGHT_DOWN: 6,
		RIGHT_UP: 7,
		WHEEL: 8,
		PINCH_START: 9,
		PINCH_END: 10,
		PINCH_MOVE: 11,
	}

	const MockScreenSpaceEventHandler = class {
		setInputAction() {}
		removeInputAction() {}
		destroy() {}
	}

	// Create the mock Cesium object
	const CesiumMock = {
		Viewer: MockViewer,
		EntityCollection: MockEntityCollection,
		DataSourceCollection: MockDataSourceCollection,
		Cartesian3: MockCartesian3,
		Color: MockColor,
		GeoJsonDataSource: MockGeoJsonDataSource,
		EllipsoidTerrainProvider: MockEllipsoidTerrainProvider,
		FeatureDetection: MockFeatureDetection,
		ShadowMode: MockShadowMode,
		ScreenSpaceEventType: MockScreenSpaceEventType,
		ScreenSpaceEventHandler: MockScreenSpaceEventHandler,
		Ion: {
			defaultAccessToken: 'mock-token',
		},
		defined: (value: any) => value !== undefined && value !== null,
		Math: {
			toDegrees: (radians: number) => (radians * 180) / Math.PI,
			toRadians: (degrees: number) => (degrees * Math.PI) / 180,
		},
		// Add more mocked classes/functions as needed
		Rectangle: class {
			west: number
			south: number
			east: number
			north: number
			constructor(west = 0, south = 0, east = 0, north = 0) {
				this.west = west
				this.south = south
				this.east = east
				this.north = north
			}
			static fromDegrees(west: number, south: number, east: number, north: number) {
				return new this(west, south, east, north)
			}
		},
		HeadingPitchRoll: class {
			heading: number
			pitch: number
			roll: number
			constructor(heading = 0, pitch = 0, roll = 0) {
				this.heading = heading
				this.pitch = pitch
				this.roll = roll
			}
		},
		JulianDate: class {
			dayNumber: number
			secondsOfDay: number
			constructor(dayNumber = 2458119, secondsOfDay = 0) {
				this.dayNumber = dayNumber
				this.secondsOfDay = secondsOfDay
			}
			static now() {
				return new this()
			}
		},
		CallbackProperty: class {},
		ConstantProperty: class {},
		SampledProperty: class {
			addSample(_time: any, _value: any) {}
		},
		BoundingSphere: class {
			center: any
			radius: number
			constructor(center = new MockCartesian3(), radius = 1000) {
				this.center = center
				this.radius = radius
			}
		},
	}

	return CesiumMock
}

// Export function to inject mock into window
export function injectCesiumMock() {
	const mock = createCesiumMock()
	;(window as any).Cesium = mock

	// Also set CESIUM_BASE_URL
	;(window as any).CESIUM_BASE_URL = '/cesium'

	return mock
}
