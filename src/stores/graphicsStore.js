import { defineStore } from 'pinia';

export const useGraphicsStore = defineStore('graphics', {
	state: () => ({
		// Anti-aliasing settings
		msaaEnabled: true,
		msaaSamples: 4, // 1 (off), 2, 4, 8
		fxaaEnabled: false,
		
		// Advanced rendering features
		hdrEnabled: false,
		ambientOcclusionEnabled: false,
		
		// Performance settings
		requestRenderMode: false,
		
		// Support detection (set at runtime)
		msaaSupported: false,
		hdrSupported: false,
		ambientOcclusionSupported: false,
	}),
	
	getters: {
		/**
		 * Get the effective MSAA sample count based on support and settings
		 */
		effectiveMsaaSamples: (state) => {
			if (!state.msaaSupported || !state.msaaEnabled) {
				return 1;
			}
			return state.msaaSamples;
		},
		
		/**
		 * Check if any anti-aliasing is active
		 */
		hasAntiAliasing: (state) => {
			return (state.msaaEnabled && state.msaaSupported && state.msaaSamples > 1) || 
			       (state.fxaaEnabled);
		},
		
		/**
		 * Get quality level description
		 */
		qualityLevel: (state) => {
			if (state.msaaEnabled && state.msaaSamples >= 8) return 'Ultra';
			if (state.msaaEnabled && state.msaaSamples >= 4) return 'High';
			if (state.msaaEnabled && state.msaaSamples >= 2) return 'Medium';
			if (state.fxaaEnabled) return 'Low (FXAA)';
			return 'Basic';
		}
	},
	
	actions: {
		/**
		 * Set hardware support detection results
		 */
		setSupportInfo(supportInfo) {
			this.msaaSupported = supportInfo.msaaSupported;
			this.hdrSupported = supportInfo.hdrSupported;
			this.ambientOcclusionSupported = supportInfo.ambientOcclusionSupported;
		},
		
		/**
		 * Update MSAA settings
		 */
		setMsaaSettings(enabled, samples = 4) {
			this.msaaEnabled = enabled;
			this.msaaSamples = Math.max(1, Math.min(8, samples));
		},
		
		/**
		 * Toggle FXAA
		 */
		setFxaaEnabled(enabled) {
			this.fxaaEnabled = enabled;
		},
		
		/**
		 * Set HDR rendering
		 */
		setHdrEnabled(enabled) {
			this.hdrEnabled = enabled && this.hdrSupported;
		},
		
		/**
		 * Set ambient occlusion
		 */
		setAmbientOcclusionEnabled(enabled) {
			this.ambientOcclusionEnabled = enabled && this.ambientOcclusionSupported;
		},
		
		/**
		 * Set request render mode for performance
		 */
		setRequestRenderMode(enabled) {
			this.requestRenderMode = enabled;
		},
		
		/**
		 * Apply preset quality levels
		 */
		applyQualityPreset(preset) {
			switch (preset) {
				case 'ultra':
					this.setMsaaSettings(true, 8);
					this.setFxaaEnabled(false);
					this.setHdrEnabled(true);
					this.setAmbientOcclusionEnabled(true);
					this.setRequestRenderMode(false);
					break;
				case 'high':
					this.setMsaaSettings(true, 4);
					this.setFxaaEnabled(false);
					this.setHdrEnabled(false);
					this.setAmbientOcclusionEnabled(true);
					this.setRequestRenderMode(false);
					break;
				case 'medium':
					this.setMsaaSettings(true, 2);
					this.setFxaaEnabled(false);
					this.setHdrEnabled(false);
					this.setAmbientOcclusionEnabled(false);
					this.setRequestRenderMode(false);
					break;
				case 'low':
					this.setMsaaSettings(false, 1);
					this.setFxaaEnabled(true);
					this.setHdrEnabled(false);
					this.setAmbientOcclusionEnabled(false);
					this.setRequestRenderMode(false);
					break;
				case 'performance':
					this.setMsaaSettings(false, 1);
					this.setFxaaEnabled(false);
					this.setHdrEnabled(false);
					this.setAmbientOcclusionEnabled(false);
					this.setRequestRenderMode(true);
					break;
				default:
					console.warn(`Unknown quality preset: ${preset}`);
			}
		}
	}
});