import { useGlobalStore } from '../stores/globalStore.js'
import { useGraphicsStore } from '../stores/graphicsStore.js'
import logger from '../utils/logger.js'
import { getCesium } from './cesiumProvider.js'

/**
 * Graphics Quality Management Service
 * Manages CesiumJS rendering quality settings including anti-aliasing (MSAA, FXAA),
 * HDR rendering, ambient occlusion, and performance optimization modes.
 * Provides hardware capability detection and reactive settings management.
 *
 * Supported graphics features:
 * - MSAA (Multi-Sample Anti-Aliasing): Hardware-based anti-aliasing (2x, 4x, 8x)
 * - FXAA (Fast Approximate Anti-Aliasing): Shader-based anti-aliasing
 * - HDR (High Dynamic Range): Enhanced lighting and color range
 * - Ambient Occlusion: Realistic shadow effects in crevices
 * - Request Render Mode: On-demand rendering for performance
 *
 * @class Graphics
 */
export default class Graphics {
	/**
	 * Creates a Graphics service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.graphicsStore = useGraphicsStore()
		this.viewer = null
		this.scene = null
		this._supportDetected = false
	}

	/**
	 * Initializes graphics quality settings for the Cesium viewer
	 * Defers hardware detection to first use for faster initial load.
	 * Sets up reactive watchers for dynamic settings changes.
	 *
	 * @param {Cesium.Viewer} viewer - CesiumJS viewer instance
	 * @returns {void}
	 */
	init(viewer) {
		this.viewer = viewer
		this.scene = viewer.scene

		// Defer hardware detection until actually needed
		// Apply settings will trigger lazy detection
		requestIdleCallback(
			() => {
				this.detectSupport()
				this.applyGraphicsSettings()
			},
			{ timeout: 2000 }
		)

		// Set up watchers for reactive updates (doesn't need detection)
		this.setupWatchers()
	}

	/**
	 * Detect hardware support for various graphics features
	 * Lazy detection - only runs once, results cached for subsequent calls.
	 */
	detectSupport() {
		// Skip if already detected
		if (this._supportDetected) return

		const Cesium = getCesium()
		const supportInfo = {
			msaaSupported: this.scene.msaaSupported,
			hdrSupported: this.scene.highDynamicRangeSupported,
			ambientOcclusionSupported: Cesium.PostProcessStageLibrary.isAmbientOcclusionSupported(
				this.scene
			),
		}

		this.graphicsStore.setSupportInfo(supportInfo)
		this._supportDetected = true

		// Log support information
		logger.debug('Graphics Support Detection:', supportInfo)

		// Warn about unsupported features
		if (!supportInfo.msaaSupported) {
			logger.warn('MSAA (Multi-Sample Anti-Aliasing) is not supported by this browser/hardware')
		}
		if (!supportInfo.hdrSupported) {
			logger.warn('HDR (High Dynamic Range) rendering is not supported by this browser/hardware')
		}
		if (!supportInfo.ambientOcclusionSupported) {
			logger.warn('Ambient Occlusion post-processing is not supported by this browser/hardware')
		}
	}

	/**
	 * Apply current graphics settings to the scene
	 */
	applyGraphicsSettings() {
		this.applyMsaaSettings()
		this.applyFxaaSettings()
		this.applyHdrSettings()
		this.applyAmbientOcclusionSettings()
		this.applyRequestRenderMode()
	}

	/**
	 * Apply MSAA (Multi-Sample Anti-Aliasing) settings
	 */
	applyMsaaSettings() {
		if (this.graphicsStore.msaaSupported) {
			const effectiveSamples = this.graphicsStore.effectiveMsaaSamples
			this.scene.msaaSamples = effectiveSamples
			logger.debug(`MSAA set to ${effectiveSamples}x samples`)
		} else {
			logger.debug('MSAA not supported, skipping')
		}
	}

	/**
	 * Apply FXAA (Fast Approximate Anti-Aliasing) settings
	 */
	applyFxaaSettings() {
		const fxaaStage = this.scene.postProcessStages.fxaa
		if (fxaaStage) {
			fxaaStage.enabled = this.graphicsStore.fxaaEnabled
			logger.debug(`FXAA ${this.graphicsStore.fxaaEnabled ? 'enabled' : 'disabled'}`)
		}
	}

	/**
	 * Apply HDR (High Dynamic Range) settings
	 */
	applyHdrSettings() {
		if (this.graphicsStore.hdrSupported) {
			this.scene.highDynamicRange = this.graphicsStore.hdrEnabled
			logger.debug(`HDR ${this.graphicsStore.hdrEnabled ? 'enabled' : 'disabled'}`)
		} else if (this.graphicsStore.hdrEnabled) {
			logger.warn('HDR requested but not supported')
		}
	}

	/**
	 * Apply Ambient Occlusion settings
	 */
	applyAmbientOcclusionSettings() {
		if (this.graphicsStore.ambientOcclusionSupported) {
			const ambientOcclusion = this.scene.postProcessStages.ambientOcclusion
			ambientOcclusion.enabled = this.graphicsStore.ambientOcclusionEnabled

			if (ambientOcclusion.enabled) {
				// Configure ambient occlusion parameters for building visualization
				ambientOcclusion.uniforms.intensity = 2.0
				ambientOcclusion.uniforms.bias = 0.1
				ambientOcclusion.uniforms.lengthCap = 0.5
				ambientOcclusion.uniforms.directionCount = 16
				ambientOcclusion.uniforms.stepCount = 32
				logger.debug('Ambient Occlusion enabled with building-optimized settings')
			} else {
				logger.debug('Ambient Occlusion disabled')
			}
		} else if (this.graphicsStore.ambientOcclusionEnabled) {
			logger.warn('Ambient Occlusion requested but not supported')
		}
	}

	/**
	 * Apply request render mode for performance optimization
	 */
	applyRequestRenderMode() {
		// Note: Request render mode should be set during viewer creation
		// This is mainly for logging current state
		if (this.graphicsStore.requestRenderMode) {
			logger.debug('Request Render Mode enabled (set during viewer creation)')
		}
	}

	/**
	 * Set up reactive watchers for graphics settings
	 */
	setupWatchers() {
		// Watch for MSAA changes
		this.graphicsStore.$subscribe((mutation, _state) => {
			if (mutation.events.some((e) => ['msaaEnabled', 'msaaSamples'].includes(e.key))) {
				this.applyMsaaSettings()
			}
			if (mutation.events.some((e) => e.key === 'fxaaEnabled')) {
				this.applyFxaaSettings()
			}
			if (mutation.events.some((e) => e.key === 'hdrEnabled')) {
				this.applyHdrSettings()
			}
			if (mutation.events.some((e) => e.key === 'ambientOcclusionEnabled')) {
				this.applyAmbientOcclusionSettings()
			}
		})
	}

	/**
	 * Get current graphics performance info
	 */
	getPerformanceInfo() {
		return {
			msaaSamples: this.scene.msaaSamples,
			fxaaEnabled: this.scene.postProcessStages.fxaa?.enabled || false,
			hdrEnabled: this.scene.highDynamicRange,
			ambientOcclusionEnabled: this.scene.postProcessStages.ambientOcclusion?.enabled || false,
			qualityLevel: this.graphicsStore.qualityLevel,
			hasAntiAliasing: this.graphicsStore.hasAntiAliasing,
		}
	}

	/**
	 * Show or hide FPS counter for performance monitoring
	 */
	setShowFps(show) {
		this.scene.debugShowFramesPerSecond = show
	}

	/**
	 * Force a render update (useful with request render mode)
	 */
	requestRender() {
		if (this.scene.requestRenderMode) {
			this.scene.requestRender()
		}
	}
}
