import * as Cesium from 'cesium';
import { useGraphicsStore } from '../stores/graphicsStore.js';
import { useGlobalStore } from '../stores/globalStore.js';

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
		this.store = useGlobalStore();
		this.graphicsStore = useGraphicsStore();
		this.viewer = null;
		this.scene = null;
	}

	/**
	 * Initializes graphics quality settings for the Cesium viewer
	 * Detects hardware support, applies initial settings, and sets up reactive watchers.
	 *
	 * @param {Cesium.Viewer} viewer - CesiumJS viewer instance
	 * @returns {void}
	 */
	init(viewer) {
		this.viewer = viewer;
		this.scene = viewer.scene;
		
		// Detect hardware support
		this.detectSupport();
		
		// Apply initial graphics settings
		this.applyGraphicsSettings();
		
		// Set up watchers for reactive updates
		this.setupWatchers();
	}

	/**
	 * Detect hardware support for various graphics features
	 */
	detectSupport() {
		const supportInfo = {
			msaaSupported: this.scene.msaaSupported,
			hdrSupported: this.scene.highDynamicRangeSupported,
			ambientOcclusionSupported: Cesium.PostProcessStageLibrary.isAmbientOcclusionSupported(this.scene)
		};
		
		this.graphicsStore.setSupportInfo(supportInfo);
		
		// Log support information
		console.log('Graphics Support Detection:', supportInfo);
		
		// Warn about unsupported features
		if (!supportInfo.msaaSupported) {
			console.warn('MSAA (Multi-Sample Anti-Aliasing) is not supported by this browser/hardware');
		}
		if (!supportInfo.hdrSupported) {
			console.warn('HDR (High Dynamic Range) rendering is not supported by this browser/hardware');
		}
		if (!supportInfo.ambientOcclusionSupported) {
			console.warn('Ambient Occlusion post-processing is not supported by this browser/hardware');
		}
	}

	/**
	 * Apply current graphics settings to the scene
	 */
	applyGraphicsSettings() {
		this.applyMsaaSettings();
		this.applyFxaaSettings();
		this.applyHdrSettings();
		this.applyAmbientOcclusionSettings();
		this.applyRequestRenderMode();
	}

	/**
	 * Apply MSAA (Multi-Sample Anti-Aliasing) settings
	 */
	applyMsaaSettings() {
		if (this.graphicsStore.msaaSupported) {
			const effectiveSamples = this.graphicsStore.effectiveMsaaSamples;
			this.scene.msaaSamples = effectiveSamples;
			console.log(`MSAA set to ${effectiveSamples}x samples`);
		} else {
			console.log('MSAA not supported, skipping');
		}
	}

	/**
	 * Apply FXAA (Fast Approximate Anti-Aliasing) settings
	 */
	applyFxaaSettings() {
		const fxaaStage = this.scene.postProcessStages.fxaa;
		if (fxaaStage) {
			fxaaStage.enabled = this.graphicsStore.fxaaEnabled;
			console.log(`FXAA ${this.graphicsStore.fxaaEnabled ? 'enabled' : 'disabled'}`);
		}
	}

	/**
	 * Apply HDR (High Dynamic Range) settings
	 */
	applyHdrSettings() {
		if (this.graphicsStore.hdrSupported) {
			this.scene.highDynamicRange = this.graphicsStore.hdrEnabled;
			console.log(`HDR ${this.graphicsStore.hdrEnabled ? 'enabled' : 'disabled'}`);
		} else if (this.graphicsStore.hdrEnabled) {
			console.warn('HDR requested but not supported');
		}
	}

	/**
	 * Apply Ambient Occlusion settings
	 */
	applyAmbientOcclusionSettings() {
		if (this.graphicsStore.ambientOcclusionSupported) {
			const ambientOcclusion = this.scene.postProcessStages.ambientOcclusion;
			ambientOcclusion.enabled = this.graphicsStore.ambientOcclusionEnabled;
			
			if (ambientOcclusion.enabled) {
				// Configure ambient occlusion parameters for building visualization
				ambientOcclusion.uniforms.intensity = 2.0;
				ambientOcclusion.uniforms.bias = 0.1;
				ambientOcclusion.uniforms.lengthCap = 0.5;
				ambientOcclusion.uniforms.directionCount = 16;
				ambientOcclusion.uniforms.stepCount = 32;
				console.log('Ambient Occlusion enabled with building-optimized settings');
			} else {
				console.log('Ambient Occlusion disabled');
			}
		} else if (this.graphicsStore.ambientOcclusionEnabled) {
			console.warn('Ambient Occlusion requested but not supported');
		}
	}

	/**
	 * Apply request render mode for performance optimization
	 */
	applyRequestRenderMode() {
		// Note: Request render mode should be set during viewer creation
		// This is mainly for logging current state
		if (this.graphicsStore.requestRenderMode) {
			console.log('Request Render Mode enabled (set during viewer creation)');
		}
	}

	/**
	 * Set up reactive watchers for graphics settings
	 */
	setupWatchers() {
		// Watch for MSAA changes
		this.graphicsStore.$subscribe((mutation, state) => {
			if (mutation.events.some(e => ['msaaEnabled', 'msaaSamples'].includes(e.key))) {
				this.applyMsaaSettings();
			}
			if (mutation.events.some(e => e.key === 'fxaaEnabled')) {
				this.applyFxaaSettings();
			}
			if (mutation.events.some(e => e.key === 'hdrEnabled')) {
				this.applyHdrSettings();
			}
			if (mutation.events.some(e => e.key === 'ambientOcclusionEnabled')) {
				this.applyAmbientOcclusionSettings();
			}
		});
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
			hasAntiAliasing: this.graphicsStore.hasAntiAliasing
		};
	}

	/**
	 * Show or hide FPS counter for performance monitoring
	 */
	setShowFps(show) {
		this.scene.debugShowFramesPerSecond = show;
	}

	/**
	 * Force a render update (useful with request render mode)
	 */
	requestRender() {
		if (this.scene.requestRenderMode) {
			this.scene.requestRender();
		}
	}
}