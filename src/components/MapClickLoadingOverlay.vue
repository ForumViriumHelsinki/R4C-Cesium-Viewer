<template>
	<v-overlay
		:model-value="isVisible"
		persistent
		eager
		:transition="false"
		:attach="true"
		class="map-click-loading-overlay"
		:z-index="1000"
	>
		<v-card
			class="loading-card pa-6"
			elevation="8"
			min-width="400"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			:aria-label="accessibleDescription"
		>
			<!-- Header -->
			<div class="d-flex align-center mb-4">
				<v-progress-circular
					indeterminate
					color="primary"
					size="32"
					:width="3"
					class="mr-4"
				/>
				<div>
					<h3 class="text-h6">
						{{ stageText }}
					</h3>
					<p class="text-body-2 text-medium-emphasis mb-0">
						{{ postalCodeName }}
					</p>
				</div>
			</div>

			<!-- Progress bar for data loading (FR-3.2 progressive updates) -->
			<v-progress-linear
				v-if="showProgress"
				:model-value="loadingProgress"
				color="primary"
				height="6"
				class="mb-2"
			/>

			<!-- Progressive loading status text (FR-3.2) -->
			<div
				v-if="showProgress && currentDataset"
				class="text-caption text-medium-emphasis mb-3"
			>
				{{ currentDataset }}
			</div>

			<!-- Cancel button (during animation stage) -->
			<v-btn
				v-if="canCancel"
				variant="outlined"
				color="primary"
				block
				aria-label="Cancel camera animation, press Escape key"
				@click="handleCancel"
				@keydown.esc="handleCancel"
			>
				<v-icon start> mdi-close </v-icon>
				Press ESC to Cancel
			</v-btn>

			<!-- Error state -->
			<v-alert
				v-if="error"
				type="error"
				variant="tonal"
				class="mt-4"
				role="alert"
				aria-live="assertive"
			>
				<div class="d-flex align-center justify-space-between">
					<span>{{ error.message }}</span>
					<v-btn
						size="small"
						variant="text"
						@click="handleRetry"
					>
						Retry
					</v-btn>
				</div>
			</v-alert>
		</v-card>
	</v-overlay>
</template>

<script>
/**
 * @module components/MapClickLoadingOverlay
 * Loading overlay component that provides visual feedback during map click processing.
 *
 * Features:
 * - Immediate visual feedback (<100ms) when user clicks postal code
 * - Progress indication through animation stages
 * - Ability to cancel camera animation via ESC key or button
 * - Error display with retry capability
 * - Full accessibility support (ARIA live regions, keyboard navigation)
 *
 * The component reactively displays based on globalStore.clickProcessingState,
 * showing different UI states for loading, animating, and complete stages.
 *
 * @see {@link module:stores/globalStore}
 */
import { computed } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

export default {
	name: 'MapClickLoadingOverlay',

	emits: ['cancel', 'retry'],

	setup(_props, { emit }) {
		const store = useGlobalStore()

		// Reactive computed properties from store state
		const isVisible = computed(() => store.clickProcessingState.isProcessing)
		const postalCodeName = computed(() => store.clickProcessingState.postalCodeName || 'Loading...')
		const stage = computed(() => store.clickProcessingState.stage)
		const canCancel = computed(() => store.clickProcessingState.canCancel)
		const error = computed(() => store.clickProcessingState.error)

		/**
		 * Returns user-friendly text for current processing stage
		 * @returns {string} Stage description text
		 */
		const stageText = computed(() => {
			switch (stage.value) {
				case 'loading':
					return 'Loading Postal Code'
				case 'animating':
					return 'Moving Camera'
				case 'complete':
					return 'Almost Ready'
				default:
					return 'Processing'
			}
		})

		/**
		 * Whether to show progress bar (during loading and animating stages)
		 * @returns {boolean}
		 */
		const showProgress = computed(() => stage.value === 'loading' || stage.value === 'animating')

		/**
		 * Current dataset being loaded (for progressive updates display)
		 * @returns {string} Dataset name
		 */
		const currentDataset = computed(() => {
			const progressData = store.clickProcessingState.loadingProgress
			if (!progressData) return ''

			// Show which step we're on
			if (progressData.current === 0) {
				return 'Preparing...'
			} else if (progressData.current === 1) {
				return 'Loading buildings...'
			} else if (progressData.current === 2) {
				return 'Complete'
			}

			return `Loading dataset ${progressData.current} of ${progressData.total}`
		})

		/**
		 * Progressive loading progress tracking (FR-3.2)
		 * Tracks actual data loading progress if available, otherwise falls back to stage-based estimate
		 * @returns {number} Progress percentage (0-100)
		 */
		const loadingProgress = computed(() => {
			// Check if we have real progress data (FR-3.2 progressive updates)
			const progressData = store.clickProcessingState.loadingProgress
			if (progressData && progressData.total > 0) {
				const percentage = Math.round((progressData.current / progressData.total) * 100)
				logger.debug(
					`[MapClickLoadingOverlay] Real progress: ${progressData.current}/${progressData.total} (${percentage}%)`
				)
				return percentage
			}

			// Fallback to stage-based estimation
			switch (stage.value) {
				case 'loading':
					return 30
				case 'animating':
					return 60
				case 'complete':
					return 100
				default:
					return 0
			}
		})

		/**
		 * Provides accessible description for screen readers
		 * @returns {string} Full description of current loading state
		 */
		const accessibleDescription = computed(() => {
			if (error.value) {
				return `Error loading ${postalCodeName.value}: ${error.value.message}. Retry button available.`
			}
			return `${stageText.value} for ${postalCodeName.value}. ${loadingProgress.value}% complete.${canCancel.value ? ' Press Escape to cancel.' : ''}`
		})

		/**
		 * Handles cancellation request from user
		 * Emits cancel event for parent component to handle
		 */
		const handleCancel = () => {
			logger.debug('[MapClickLoadingOverlay] User requested cancellation')
			emit('cancel')
		}

		/**
		 * Handles retry request after error
		 * Emits retry event for parent component to handle
		 */
		const handleRetry = () => {
			logger.debug('[MapClickLoadingOverlay] User requested retry')
			emit('retry')
		}

		return {
			isVisible,
			postalCodeName,
			stage,
			stageText,
			canCancel,
			error,
			showProgress,
			loadingProgress,
			currentDataset,
			accessibleDescription,
			handleCancel,
			handleRetry,
		}
	},
}
</script>

<style scoped>
.map-click-loading-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
}

.loading-card {
	background: rgba(255, 255, 255, 0.98);
	backdrop-filter: blur(10px);
}

/* Reduced motion support for accessibility */
@media (prefers-reduced-motion: reduce) {
	.v-progress-circular {
		animation: none;
	}

	.v-progress-linear {
		animation: none;
	}
}
</style>
