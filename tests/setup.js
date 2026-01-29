import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock CSS imports
vi.mock('*.css', () => ({}))

// Create Cartesian3 as constructor function with static methods
function Cartesian3Mock(x = 0, y = 0, z = 0) {
	this.x = x
	this.y = y
	this.z = z
}
Cartesian3Mock.fromDegrees = vi.fn(() => new Cartesian3Mock())
Cartesian3Mock.add = vi.fn((a, b, result) => result || new Cartesian3Mock())
Cartesian3Mock.subtract = vi.fn((a, b, result) => result || new Cartesian3Mock())
Cartesian3Mock.multiplyByScalar = vi.fn((a, scalar, result) => result || new Cartesian3Mock())
Cartesian3Mock.magnitude = vi.fn(() => 1)
Cartesian3Mock.normalize = vi.fn((a, result) => result || new Cartesian3Mock(0, 0, 1))

// Create Cesium mock to be shared between cesium and cesiumProvider mocks
const cesiumMock = {
	Viewer: vi.fn(),
	Cartesian3: Cartesian3Mock,
	Cartographic: {
		fromCartesian: vi.fn(() => ({ longitude: 0, latitude: 0, height: 0 })),
		toCartesian: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
	},
	Color: {
		YELLOW: { withAlpha: vi.fn(() => ({ red: 1, green: 1, blue: 0, alpha: 1 })) },
		RED: { withAlpha: vi.fn(() => ({ red: 1, green: 0, blue: 0, alpha: 1 })) },
		BLUE: { withAlpha: vi.fn(() => ({ red: 0, green: 0, blue: 1, alpha: 1 })) },
		GREEN: { withAlpha: vi.fn(() => ({ red: 0, green: 1, blue: 0, alpha: 1 })) },
		WHITE: { withAlpha: vi.fn(() => ({ red: 1, green: 1, blue: 1, alpha: 1 })) },
		BLACK: { withAlpha: vi.fn(() => ({ red: 0, green: 0, blue: 0, alpha: 1 })) },
		fromCssColorString: vi.fn(() => ({
			red: 0.5,
			green: 0.5,
			blue: 0.5,
			alpha: 1,
			withAlpha: vi.fn(),
		})),
	},
	DataSource: vi.fn(),
	CustomDataSource: vi.fn(function (name) {
		this.name = name
		this.entities = {
			values: [],
			add: vi.fn((entity) => {
				this.entities.values.push(entity)
				return entity
			}),
			remove: vi.fn(),
			removeAll: vi.fn(() => {
				this.entities.values = []
			}),
		}
	}),
	GeoJsonDataSource: {
		load: vi.fn(),
	},
	ImageryLayer: vi.fn(),
	WebMapServiceImageryProvider: vi.fn(),
	TileMapServiceImageryProvider: vi.fn(),
	Camera: {
		flyTo: vi.fn(),
		setView: vi.fn(),
	},
	Scene: {
		pick: vi.fn(),
	},
	Rectangle: vi.fn(function () {
		this.west = 0
		this.south = 0
		this.east = 0
		this.north = 0
	}),
	Math: {
		toDegrees: vi.fn((radians) => (radians * 180) / Math.PI),
		toRadians: vi.fn((degrees) => (degrees * Math.PI) / 180),
	},
	Entity: vi.fn(function (options) {
		Object.assign(this, options)
	}),
	ConstantProperty: vi.fn(function (value) {
		this.getValue = vi.fn(() => value)
	}),
	ColorMaterialProperty: vi.fn(function (color) {
		this.color = color
	}),
	PolygonHierarchy: vi.fn(function (positions) {
		this.positions = positions
	}),
	PolylineOutlineMaterialProperty: vi.fn(function (options) {
		Object.assign(this, options)
	}),
	HeightReference: {
		CLAMP_TO_GROUND: 0,
		RELATIVE_TO_GROUND: 1,
		NONE: 2,
	},
	VerticalOrigin: {
		CENTER: 0,
		BOTTOM: 1,
		TOP: 2,
	},
	HorizontalOrigin: {
		CENTER: 0,
		LEFT: 1,
		RIGHT: 2,
	},
	LabelStyle: {
		FILL: 0,
		OUTLINE: 1,
		FILL_AND_OUTLINE: 2,
	},
	Ellipsoid: {
		WGS84: {
			cartesianToCartographic: vi.fn(() => ({ longitude: 0, latitude: 0, height: 0 })),
			cartographicToCartesian: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
		},
	},
	GeographicTilingScheme: vi.fn(function () {
		this.getNumberOfXTilesAtLevel = vi.fn(() => 2)
		this.getNumberOfYTilesAtLevel = vi.fn(() => 1)
	}),
	WebMercatorTilingScheme: vi.fn(function () {
		this.getNumberOfXTilesAtLevel = vi.fn(() => 1)
		this.getNumberOfYTilesAtLevel = vi.fn(() => 1)
	}),
	ScreenSpaceEventHandler: vi.fn(function () {
		this.setInputAction = vi.fn()
		this.removeInputAction = vi.fn()
		this.destroy = vi.fn()
	}),
	ScreenSpaceEventType: {
		LEFT_CLICK: 0,
		LEFT_DOUBLE_CLICK: 1,
		LEFT_DOWN: 2,
		LEFT_UP: 3,
		MIDDLE_CLICK: 4,
		MIDDLE_DOWN: 5,
		MIDDLE_UP: 6,
		MOUSE_MOVE: 7,
		RIGHT_CLICK: 8,
		RIGHT_DOWN: 9,
		RIGHT_UP: 10,
		WHEEL: 11,
	},
	defined: vi.fn((value) => value !== undefined && value !== null),
	Cartesian2: vi.fn(function (x = 0, y = 0) {
		this.x = x
		this.y = y
	}),
}

// Mock Cesium module
vi.mock('cesium', () => cesiumMock)

// Mock cesiumProvider to return pre-initialized Cesium mock
vi.mock('@/services/cesiumProvider', () => ({
	cesiumProvider: {
		initialize: vi.fn().mockResolvedValue(cesiumMock),
		get: vi.fn(() => cesiumMock),
		isInitialized: vi.fn(() => true),
		_initialized: true,
		_cesium: cesiumMock,
	},
	getCesium: vi.fn(() => cesiumMock),
}))

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
})

// Mock IntersectionObserver - use class for constructor compatibility
global.IntersectionObserver = class MockIntersectionObserver {
	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
	constructor() {}
}

// Mock ResizeObserver - use class for constructor compatibility
global.ResizeObserver = class MockResizeObserver {
	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
	constructor() {}
}

// Set up global test configuration
config.global.mocks = {
	$route: {
		path: '/',
		query: {},
		params: {},
	},
	$router: {
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
	},
}

// Add global render stub for Vuetify components that need VApp wrapper
config.global.renderStubDefaultSlot = true

// Mock window properties
Object.defineProperty(window, 'location', {
	value: {
		href: 'http://localhost:3000',
		search: '',
		pathname: '/',
	},
	writable: true,
})

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock localStorage with actual storage functionality
const createLocalStorageMock = () => {
	const store = {}
	return {
		getItem: vi.fn((key) => store[key] || null),
		setItem: vi.fn((key, value) => {
			if (value != null) {
				store[key] = value.toString()
			}
		}),
		removeItem: vi.fn((key) => {
			delete store[key]
		}),
		clear: vi.fn(() => {
			Object.keys(store).forEach((key) => delete store[key])
		}),
		key: vi.fn((index) => {
			const keys = Object.keys(store)
			return keys[index] || null
		}),
		get length() {
			return Object.keys(store).length
		},
	}
}

const localStorageMock = createLocalStorageMock()
global.localStorage = localStorageMock
Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
	writable: true,
})
