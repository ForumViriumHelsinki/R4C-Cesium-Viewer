<template>
	<div class="viewport-loading-container">
		<!-- Compact Loading Badge (Bottom Right) -->
		<transition name="slide-fade">
			<v-card
				v-if="showIndicator"
				class="viewport-loading-badge"
				elevation="4"
				:color="cardColor"
				:aria-label="ariaLabel"
				role="status"
				aria-live="polite"
				aria-atomic="true"
			>
				<div class="loading-content">
					<!-- Loading State -->
					<template v-if="isLoading">
						<v-progress-circular
							size="20"
							width="2"
							color="white"
							indeterminate
							class="mr-2"
							aria-hidden="true"
						/>
						<div class="loading-text">
							<div class="loading-title">
								{{ loadingTitle }}
							</div>
							<div
								v-if="loadingDetail"
								class="loading-detail"
							>
								{{ loadingDetail }}
							</div>
						</div>
					</template>

					<!-- Complete State -->
					<template v-else-if="showComplete">
						<v-icon
							size="20"
							color="white"
							class="mr-2"
							aria-hidden="true"
						>
							mdi-check-circle
						</v-icon>
						<span class="complete-text">{{ completeMessage }}</span>
					</template>

					<!-- Error State -->
					<template v-else-if="hasError">
						<v-icon
							size="20"
							color="white"
							class="mr-2"
							aria-hidden="true"
						>
							mdi-alert-circle
						</v-icon>
						<span class="error-text">{{ errorMessage }}</span>
						<v-btn
							size="x-small"
							variant="text"
							color="white"
							class="ml-2 retry-btn"
							aria-label="Retry loading buildings"
							@click="handleRetry"
						>
							Retry
						</v-btn>
					</template>
				</div>

				<!-- Progress Bar -->
				<v-progress-linear
					v-if="isLoading && showProgress"
					:model-value="progressValue"
					color="white"
					height="3"
					class="progress-bar"
					:aria-valuenow="progressValue"
					:aria-valuemin="0"
					:aria-valuemax="100"
					role="progressbar"
					aria-label="Building load progress"
				/>
			</v-card>
		</transition>

		<!-- Screen Reader Announcements -->
		<div
			class="sr-only"
			aria-live="assertive"
			aria-atomic="true"
		>
			{{ screenReaderAnnouncement }}
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useLoadingStore } from '../stores/loadingStore';

// Props
const props = defineProps({
	// Number of postal codes being loaded
	postalCodesLoading: {
		type: Number,
		default: 0,
	},
	// Total postal codes to load
	postalCodesTotal: {
		type: Number,
		default: 0,
	},
	// Whether loading is in progress
	isLoadingBuildings: {
		type: Boolean,
		default: false,
	},
	// Custom error message
	error: {
		type: String,
		default: null,
	},
	// Auto-hide completed state after delay (ms)
	autoHideDelay: {
		type: Number,
		default: 2000,
	},
});

// Emits
const emit = defineEmits(['retry']);

// Store
const loadingStore = useLoadingStore();

// Local state
const showComplete = ref(false);
const screenReaderAnnouncement = ref('');
let completeTimeout = null;

// Computed properties
const isLoading = computed(() => {
	return props.isLoadingBuildings || loadingStore.layerLoading.buildings;
});

const hasError = computed(() => {
	return !!props.error || !!loadingStore.loadingErrors.buildings;
});

const errorMessage = computed(() => {
	return props.error || loadingStore.loadingErrors.buildings || 'Failed to load buildings';
});

const showIndicator = computed(() => {
	return isLoading.value || showComplete.value || hasError.value;
});

const showProgress = computed(() => {
	return props.postalCodesTotal > 1;
});

const progressValue = computed(() => {
	if (props.postalCodesTotal === 0) return 0;
	return Math.round((props.postalCodesLoading / props.postalCodesTotal) * 100);
});

const cardColor = computed(() => {
	if (hasError.value) return 'error';
	if (showComplete.value) return 'success';
	return 'primary';
});

const loadingTitle = computed(() => {
	if (props.postalCodesTotal === 1) {
		return 'Loading buildings...';
	}
	if (props.postalCodesTotal > 1) {
		return `Loading buildings (${props.postalCodesLoading}/${props.postalCodesTotal})`;
	}
	return 'Loading buildings...';
});

const loadingDetail = computed(() => {
	if (props.postalCodesTotal > 1) {
		return 'Pan and zoom to load more areas';
	}
	return null;
});

const completeMessage = computed(() => {
	if (props.postalCodesTotal === 1) {
		return 'Buildings loaded';
	}
	if (props.postalCodesTotal > 1) {
		return `${props.postalCodesTotal} areas loaded`;
	}
	return 'Complete';
});

const ariaLabel = computed(() => {
	if (isLoading.value) {
		return `Loading buildings for ${props.postalCodesTotal} postal code areas, ${progressValue.value}% complete`;
	}
	if (showComplete.value) {
		return `Successfully loaded buildings for ${props.postalCodesTotal} areas`;
	}
	if (hasError.value) {
		return `Error loading buildings: ${errorMessage.value}. Press retry button to try again.`;
	}
	return '';
});

// Methods
const handleRetry = () => {
	emit('retry');
};

// Watch for loading state changes to show completion
watch(isLoading, (newValue, oldValue) => {
	// Detect transition from loading to not loading
	if (oldValue && !newValue && !hasError.value) {
		// Clear any pending timeout
		if (completeTimeout) {
			clearTimeout(completeTimeout);
		}

		// Show completion state
		showComplete.value = true;

		// Announce to screen readers
		screenReaderAnnouncement.value = completeMessage.value;

		// Auto-hide after delay
		completeTimeout = setTimeout(() => {
			showComplete.value = false;
			screenReaderAnnouncement.value = '';
		}, props.autoHideDelay);
	}

	// Announce loading start to screen readers
	if (newValue && !oldValue) {
		screenReaderAnnouncement.value = `Loading buildings for ${props.postalCodesTotal || 'visible'} areas`;
	}
});

// Announce errors to screen readers
watch(hasError, (newValue) => {
	if (newValue) {
		screenReaderAnnouncement.value = `Error: ${errorMessage.value}`;
	}
});

// Cleanup on unmount
onUnmounted(() => {
	if (completeTimeout) {
		clearTimeout(completeTimeout);
	}
});
</script>

<style scoped>
.viewport-loading-container {
	position: fixed;
	bottom: 24px;
	right: 24px;
	z-index: 1000;
	pointer-events: auto;
}

.viewport-loading-badge {
	min-width: 200px;
	max-width: 320px;
	border-radius: 8px;
	overflow: hidden;
}

.loading-content {
	display: flex;
	align-items: center;
	padding: 12px 16px;
	color: white;
}

.loading-text {
	display: flex;
	flex-direction: column;
}

.loading-title {
	font-size: 0.875rem;
	font-weight: 500;
	line-height: 1.2;
}

.loading-detail {
	font-size: 0.75rem;
	opacity: 0.85;
	margin-top: 2px;
}

.complete-text,
.error-text {
	font-size: 0.875rem;
	font-weight: 500;
}

.retry-btn {
	text-transform: none;
	font-size: 0.75rem;
}

.progress-bar {
	margin-top: -2px;
}

/* Transition animations */
.slide-fade-enter-active {
	transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
	transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
	transform: translateX(100%);
	opacity: 0;
}

.slide-fade-leave-to {
	transform: translateY(20px);
	opacity: 0;
}

/* Screen reader only class */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
	.slide-fade-enter-active,
	.slide-fade-leave-active {
		transition: none;
	}

	.v-progress-circular {
		animation: none;
	}
}

/* Mobile responsive adjustments */
@media (max-width: 600px) {
	.viewport-loading-container {
		bottom: 16px;
		right: 16px;
		left: 16px;
	}

	.viewport-loading-badge {
		max-width: none;
	}
}
</style>
