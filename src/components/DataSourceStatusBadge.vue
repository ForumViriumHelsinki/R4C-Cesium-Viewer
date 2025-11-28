<template>
	<v-menu
		:close-on-content-click="false"
		location="bottom end"
		:offset="8"
	>
		<template #activator="{ props: activatorProps }">
			<v-btn
				v-bind="activatorProps"
				size="small"
				variant="text"
				class="status-badge-btn"
				aria-label="Data source status"
			>
				<v-icon
					:color="overallStatusColor"
					:size="18"
					class="status-icon"
				>
					{{ overallStatusIcon }}
				</v-icon>
				<span
					class="status-count"
					:class="`text-${overallStatusColor}`"
				>
					{{ healthyCount }}/{{ totalSources }}
				</span>
			</v-btn>
		</template>

		<v-card
			class="status-menu-card"
			:min-width="280"
			:max-width="320"
		>
			<v-card-title class="d-flex align-center justify-space-between pa-3">
				<span class="text-subtitle-2">Data Sources</span>
				<v-chip
					size="x-small"
					:color="overallStatusColor"
					variant="flat"
				>
					{{ healthyCount }}/{{ totalSources }}
				</v-chip>
			</v-card-title>

			<v-divider />

			<v-card-text
				class="pa-2"
				style="max-height: 240px; overflow-y: auto"
			>
				<div
					v-for="source in dataSources"
					:key="source.id"
					class="source-item mb-2"
				>
					<div class="d-flex align-center gap-2">
						<v-icon
							:color="getStatusColor(source.status)"
							:size="14"
						>
							{{ getStatusIcon(source) }}
						</v-icon>

						<span class="text-caption flex-grow-1">{{ source.name }}</span>

						<v-icon
							v-if="source.cached"
							:size="12"
							color="blue"
						>
							mdi-cached
						</v-icon>

						<span
							v-if="source.responseTime"
							class="text-caption response-time"
							:class="getResponseTimeClass(source.responseTime)"
						>
							{{ source.responseTime }}ms
						</span>
					</div>

					<div
						v-if="source.status === 'error'"
						class="text-caption error-msg ml-6"
					>
						{{ source.message }}
					</div>
				</div>
			</v-card-text>

			<v-divider />

			<v-card-actions class="pa-2">
				<v-btn
					size="small"
					variant="text"
					:loading="refreshing"
					prepend-icon="mdi-refresh"
					@click="refreshAll"
				>
					Refresh
				</v-btn>

				<v-spacer />

				<v-btn
					v-if="hasCachedData"
					size="small"
					variant="text"
					color="warning"
					prepend-icon="mdi-delete-sweep"
					@click="clearAllCache"
				>
					Clear Cache
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-menu>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import cacheService from '../services/cacheService';

// Props
const props = defineProps({
	refreshInterval: {
		type: Number,
		default: 30000,
	},
});

// Emits
const emit = defineEmits(['source-retry', 'cache-cleared']);

// Local state
const refreshing = ref(false);
const refreshTimer = ref(null);

// Data sources to monitor
const dataSources = ref([
	{
		id: 'pygeoapi',
		name: 'PyGeoAPI',
		url: '/pygeoapi/collections/heatexposure_optimized/items?f=json&limit=1',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		cached: false,
		responseTime: null,
	},
	{
		id: 'hsy-action',
		name: 'HSY Environmental',
		url: '/hsy-action?action_route=GetHierarchicalMapLayerGroups',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		cached: false,
		responseTime: null,
	},
	{
		id: 'paavo',
		name: 'Statistics Finland',
		url: '/paavo',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		cached: false,
		responseTime: null,
	},
	{
		id: 'digitransit',
		name: 'Digitransit API',
		url: '/digitransit/geocoding/v1/search?text=Helsinki',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		cached: false,
		responseTime: null,
	},
]);

// Computed properties
const totalSources = computed(() => dataSources.value.length);
const healthyCount = computed(() => dataSources.value.filter((s) => s.status === 'healthy').length);
const hasErrors = computed(() => dataSources.value.some((s) => s.status === 'error'));
const hasWarnings = computed(() => dataSources.value.some((s) => s.status === 'degraded'));
const hasCachedData = computed(() => dataSources.value.some((s) => s.cached));

const overallStatusColor = computed(() => {
	if (hasErrors.value) return 'error';
	if (hasWarnings.value) return 'warning';
	if (healthyCount.value > 0) return 'success';
	return 'grey';
});

const overallStatusIcon = computed(() => {
	if (hasErrors.value) return 'mdi-alert-circle';
	if (hasWarnings.value) return 'mdi-alert';
	if (healthyCount.value > 0) return 'mdi-check-circle';
	return 'mdi-help-circle';
});

// Methods
const getStatusColor = (status) => {
	const colors = {
		healthy: 'success',
		degraded: 'warning',
		error: 'error',
		loading: 'info',
		unknown: 'grey',
	};
	return colors[status] || 'grey';
};

const getStatusIcon = (source) => {
	if (source.loading) return 'mdi-loading';

	const icons = {
		healthy: 'mdi-check',
		degraded: 'mdi-alert',
		error: 'mdi-close',
		unknown: 'mdi-help',
	};
	return icons[source.status] || 'mdi-help';
};

const getResponseTimeClass = (responseTime) => {
	if (responseTime > 5000) return 'response-slow';
	if (responseTime > 2000) return 'response-medium';
	return 'response-fast';
};

const checkHealth = async (sourceId) => {
	const source = dataSources.value.find((s) => s.id === sourceId);
	if (!source) return;

	source.loading = true;
	const startTime = Date.now();

	try {
		const cacheKey = `health-${sourceId}`;
		const cached = await cacheService.getData(cacheKey, 5 * 60 * 1000);

		if (cached) {
			source.cached = true;
		}

		const response = await fetch(source.url, {
			method: 'GET',
			headers: { Accept: 'application/json' },
		});

		const responseTime = Date.now() - startTime;
		source.responseTime = responseTime;

		if (response.ok) {
			const data = await response.json();

			await cacheService.setData(cacheKey, data, {
				type: source.id,
				ttl: 5 * 60 * 1000,
			});

			if (responseTime > 5000) {
				source.status = 'degraded';
				source.message = `Slow response (${responseTime}ms)`;
			} else {
				source.status = 'healthy';
				source.message = `Responsive (${responseTime}ms)`;
			}
		} else {
			source.status = 'error';
			source.message = `HTTP ${response.status}`;
		}
	} catch (error) {
		source.status = 'error';
		source.message = error.message.includes('fetch') ? 'Connection failed' : error.message;
		source.responseTime = Date.now() - startTime;
	} finally {
		source.loading = false;
	}
};

const refreshAll = async () => {
	refreshing.value = true;

	try {
		await Promise.all(dataSources.value.map((source) => checkHealth(source.id)));
	} finally {
		refreshing.value = false;
	}
};

const clearAllCache = async () => {
	await cacheService.clearAll();

	dataSources.value.forEach((source) => {
		source.cached = false;
	});

	emit('cache-cleared', 'all');
};

const startRefreshTimer = () => {
	if (refreshTimer.value) clearInterval(refreshTimer.value);

	refreshTimer.value = setInterval(() => {
		if (!refreshing.value) {
			refreshAll();
		}
	}, props.refreshInterval);
};

// Lifecycle
onMounted(async () => {
	await refreshAll();
	startRefreshTimer();
});

onUnmounted(() => {
	if (refreshTimer.value) {
		clearInterval(refreshTimer.value);
	}
});
</script>

<style scoped>
.status-badge-btn {
	opacity: 0.9;
	transition: opacity 0.2s;
	gap: 4px;
}

.status-badge-btn:hover {
	opacity: 1;
}

.status-icon {
	flex-shrink: 0;
}

.status-count {
	font-size: 0.75rem;
	font-weight: 600;
	line-height: 1;
	font-variant-numeric: tabular-nums;
}

.status-menu-card {
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.source-item {
	padding: 4px 8px;
	border-radius: 4px;
	transition: background-color 0.2s;
}

.source-item:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.response-time {
	font-family: monospace;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 0.7rem;
}

.response-fast {
	background-color: rgba(76, 175, 80, 0.1);
	color: #4caf50;
}

.response-medium {
	background-color: rgba(255, 152, 0, 0.1);
	color: #ff9800;
}

.response-slow {
	background-color: rgba(244, 67, 54, 0.1);
	color: #f44336;
}

.error-msg {
	color: #f44336;
	font-style: italic;
	margin-top: 2px;
}

/* Animation for loading icon */
:deep(.mdi-loading) {
	animation: rotate 2s linear infinite;
}

@keyframes rotate {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
