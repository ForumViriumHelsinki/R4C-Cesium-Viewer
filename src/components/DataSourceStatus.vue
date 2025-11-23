<template>
	<v-card
		class="data-source-status"
		:class="{ compact: compactMode }"
	>
		<v-card-title
			v-if="!compactMode"
			class="status-title"
		>
			<v-icon class="mr-2"> mdi-database-check </v-icon>
			Data Sources
			<v-spacer />
			<v-btn
				icon
				size="small"
				:loading="refreshing"
				@click="refreshAll"
			>
				<v-icon>mdi-refresh</v-icon>
			</v-btn>
		</v-card-title>

		<v-card-text :class="{ 'pa-2': compactMode }">
			<!-- Overall Status Summary -->
			<div
				v-if="!compactMode"
				class="status-summary mb-4"
			>
				<div class="summary-item">
					<v-icon
						:color="overallStatusColor"
						class="mr-1"
					>
						{{ overallStatusIcon }}
					</v-icon>
					<span class="summary-text">{{ overallStatusText }}</span>
				</div>
				<div class="summary-stats">
					<v-chip
						size="small"
						color="success"
						variant="text"
					>
						{{ healthyCount }} healthy
					</v-chip>
					<v-chip
						size="small"
						color="warning"
						variant="text"
					>
						{{ degradedCount }} degraded
					</v-chip>
					<v-chip
						size="small"
						color="error"
						variant="text"
					>
						{{ errorCount }} error
					</v-chip>
				</div>
			</div>

			<!-- Individual Data Source Status -->
			<div class="source-list">
				<div
					v-for="source in dataSources"
					:key="source.id"
					class="source-item"
					:class="{ 'compact-item': compactMode }"
				>
					<!-- Source Info -->
					<div class="source-info">
						<div class="source-header">
							<v-icon
								:color="getStatusColor(source.status)"
								:class="{ rotating: source.loading }"
								size="16"
								class="mr-2"
							>
								{{ getStatusIcon(source) }}
							</v-icon>
							<span class="source-name">{{ source.name }}</span>

							<!-- Cache Indicator -->
							<v-tooltip
								v-if="source.cached"
								location="top"
							>
								<template #activator="{ props: tooltipProps }">
									<v-icon
										v-bind="tooltipProps"
										size="12"
										color="blue"
										class="ml-1 cache-indicator"
									>
										mdi-cached
									</v-icon>
								</template>
								<span>Data cached ({{ formatAge(source.cacheAge) }} old)</span>
							</v-tooltip>
						</div>

						<!-- Compact Mode Details -->
						<div
							v-if="compactMode && source.status !== 'healthy'"
							class="compact-details"
						>
							<span class="status-message">{{ source.message }}</span>
						</div>

						<!-- Full Mode Details -->
						<div
							v-if="!compactMode"
							class="source-details"
						>
							<div class="detail-row">
								<span class="detail-label">Status:</span>
								<span
									class="detail-value"
									:class="getStatusClass(source.status)"
								>
									{{ source.message }}
								</span>
							</div>

							<div
								v-if="source.lastUpdated"
								class="detail-row"
							>
								<span class="detail-label">Updated:</span>
								<span class="detail-value">{{ formatTimestamp(source.lastUpdated) }}</span>
							</div>

							<div
								v-if="source.responseTime"
								class="detail-row"
							>
								<span class="detail-label">Response:</span>
								<span class="detail-value">{{ source.responseTime }}ms</span>
							</div>

							<div
								v-if="source.cached"
								class="detail-row"
							>
								<span class="detail-label">Cache:</span>
								<span class="detail-value cache-info">
									{{ formatCacheSize(source.cacheSize) }}
									({{ formatAge(source.cacheAge) }} old)
								</span>
							</div>
						</div>
					</div>

					<!-- Actions -->
					<div class="source-actions">
						<v-tooltip
							v-if="source.status === 'error'"
							location="top"
						>
							<template #activator="{ props: tooltipProps }">
								<v-btn
									v-bind="tooltipProps"
									icon
									size="x-small"
									color="error"
									variant="text"
									:loading="source.retrying"
									@click="retrySource(source.id)"
								>
									<v-icon size="14"> mdi-refresh </v-icon>
								</v-btn>
							</template>
							<span>Retry connection</span>
						</v-tooltip>

						<v-tooltip
							v-if="source.cached"
							location="top"
						>
							<template #activator="{ props: tooltipProps }">
								<v-btn
									v-bind="tooltipProps"
									icon
									size="x-small"
									color="orange"
									variant="text"
									@click="clearCache(source.id)"
								>
									<v-icon size="14"> mdi-delete-variant </v-icon>
								</v-btn>
							</template>
							<span>Clear cached data</span>
						</v-tooltip>

						<v-menu
							v-if="!compactMode"
							location="bottom end"
						>
							<template #activator="{ props: menuProps }">
								<v-btn
									v-bind="menuProps"
									icon
									size="x-small"
									variant="text"
								>
									<v-icon size="14"> mdi-dots-vertical </v-icon>
								</v-btn>
							</template>

							<v-list density="compact">
								<v-list-item @click="checkHealth(source.id)">
									<template #prepend>
										<v-icon size="16"> mdi-heart-pulse </v-icon>
									</template>
									<v-list-item-title>Health Check</v-list-item-title>
								</v-list-item>

								<v-list-item @click="preloadData(source.id)">
									<template #prepend>
										<v-icon size="16"> mdi-download </v-icon>
									</template>
									<v-list-item-title>Preload Data</v-list-item-title>
								</v-list-item>

								<v-list-item @click="showDetails(source)">
									<template #prepend>
										<v-icon size="16"> mdi-information </v-icon>
									</template>
									<v-list-item-title>View Details</v-list-item-title>
								</v-list-item>
							</v-list>
						</v-menu>
					</div>
				</div>
			</div>

			<!-- Cache Statistics -->
			<v-expand-transition>
				<div
					v-if="showCacheStats && !compactMode"
					class="cache-stats mt-4"
				>
					<v-divider class="mb-3" />
					<h4 class="cache-stats-title">
						<v-icon
							class="mr-1"
							size="16"
						>
							mdi-database
						</v-icon>
						Cache Statistics
					</h4>

					<div class="stats-grid">
						<div class="stat-item">
							<span class="stat-label">Total Entries:</span>
							<span class="stat-value">{{ cacheStats.totalEntries || 0 }}</span>
						</div>

						<div class="stat-item">
							<span class="stat-label">Storage Used:</span>
							<span class="stat-value">
								{{ formatCacheSize(cacheStats.totalSize || 0) }} /
								{{ formatCacheSize(cacheStats.maxSize || 0) }}
							</span>
						</div>

						<div class="stat-item">
							<span class="stat-label">Utilization:</span>
							<span class="stat-value">{{ Math.round(cacheStats.utilizationPercent || 0) }}%</span>
						</div>

						<div class="stat-item">
							<span class="stat-label">Expired:</span>
							<span class="stat-value">{{ cacheStats.expiredCount || 0 }}</span>
						</div>
					</div>

					<v-progress-linear
						:model-value="cacheStats.utilizationPercent || 0"
						height="4"
						:color="getCacheUtilizationColor(cacheStats.utilizationPercent)"
						class="mt-2"
					/>
				</div>
			</v-expand-transition>

			<!-- Actions Row -->
			<div
				v-if="!compactMode"
				class="actions-row mt-4"
			>
				<v-btn
					size="small"
					variant="text"
					@click="showCacheStats = !showCacheStats"
				>
					<v-icon
						class="mr-1"
						size="16"
					>
						{{ showCacheStats ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
					</v-icon>
					{{ showCacheStats ? 'Hide' : 'Show' }} Cache Stats
				</v-btn>

				<v-spacer />

				<v-btn
					size="small"
					color="warning"
					variant="text"
					@click="clearAllCache"
				>
					<v-icon
						class="mr-1"
						size="16"
					>
						mdi-delete-sweep
					</v-icon>
					Clear Cache
				</v-btn>
			</div>
		</v-card-text>

		<!-- Details Dialog -->
		<v-dialog
			v-model="detailsDialog"
			max-width="600"
		>
			<v-card v-if="selectedSource">
				<v-card-title> {{ selectedSource.name }} Details </v-card-title>

				<v-card-text>
					<div class="details-content">
						<div class="detail-section">
							<h4>Connection Status</h4>
							<v-table density="compact">
								<tbody>
									<tr>
										<td>Status</td>
										<td :class="getStatusClass(selectedSource.status)">
											{{ selectedSource.status }}
										</td>
									</tr>
									<tr>
										<td>Message</td>
										<td>{{ selectedSource.message }}</td>
									</tr>
									<tr v-if="selectedSource.url">
										<td>Endpoint</td>
										<td class="url-cell">
											{{ selectedSource.url }}
										</td>
									</tr>
									<tr v-if="selectedSource.responseTime">
										<td>Response Time</td>
										<td>{{ selectedSource.responseTime }}ms</td>
									</tr>
								</tbody>
							</v-table>
						</div>

						<div
							v-if="selectedSource.cached"
							class="detail-section"
						>
							<h4>Cache Information</h4>
							<v-table density="compact">
								<tbody>
									<tr>
										<td>Cache Size</td>
										<td>{{ formatCacheSize(selectedSource.cacheSize) }}</td>
									</tr>
									<tr>
										<td>Cache Age</td>
										<td>{{ formatAge(selectedSource.cacheAge) }}</td>
									</tr>
									<tr>
										<td>Last Updated</td>
										<td>{{ formatTimestamp(selectedSource.lastUpdated) }}</td>
									</tr>
								</tbody>
							</v-table>
						</div>
					</div>
				</v-card-text>

				<v-card-actions>
					<v-spacer />
					<v-btn @click="detailsDialog = false"> Close </v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLoadingStore } from '../stores/loadingStore';
import cacheService from '../services/cacheService';

// Props
const props = defineProps({
	compactMode: {
		type: Boolean,
		default: false,
	},
	refreshInterval: {
		type: Number,
		default: 30000, // 30 seconds
	},
});

// Emits
const emit = defineEmits(['source-retry', 'cache-cleared', 'data-preload']);

// Store
const loadingStore = useLoadingStore();

// Local state
const refreshing = ref(false);
const showCacheStats = ref(false);
const detailsDialog = ref(false);
const selectedSource = ref(null);
const cacheStats = ref({});
const refreshTimer = ref(null);

// Data sources to monitor
const dataSources = ref([
	{
		id: 'pygeoapi',
		name: 'PyGeoAPI',
		url: '/pygeoapi/collections/heatexposure_optimized/items?f=json&limit=1',
		type: 'heat-exposure',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		retrying: false,
		cached: false,
		lastUpdated: null,
		responseTime: null,
		cacheAge: null,
		cacheSize: null,
	},
	{
		id: 'hsy-action',
		name: 'HSY Environmental',
		url: '/hsy-action?action_route=GetHierarchicalMapLayerGroups',
		type: 'environmental',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		retrying: false,
		cached: false,
		lastUpdated: null,
		responseTime: null,
		cacheAge: null,
		cacheSize: null,
	},
	{
		id: 'paavo',
		name: 'Statistics Finland',
		url: '/paavo',
		type: 'postal-codes',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		retrying: false,
		cached: false,
		lastUpdated: null,
		responseTime: null,
		cacheAge: null,
		cacheSize: null,
	},
	{
		id: 'digitransit',
		name: 'Digitransit API',
		url: '/digitransit/geocoding/v1/search?text=Helsinki',
		type: 'geocoding',
		status: 'unknown',
		message: 'Not checked',
		loading: false,
		retrying: false,
		cached: false,
		lastUpdated: null,
		responseTime: null,
		cacheAge: null,
		cacheSize: null,
	},
]);

// Computed properties
const healthyCount = computed(() => dataSources.value.filter((s) => s.status === 'healthy').length);

const degradedCount = computed(
	() => dataSources.value.filter((s) => s.status === 'degraded').length
);

const errorCount = computed(() => dataSources.value.filter((s) => s.status === 'error').length);

const overallStatusColor = computed(() => {
	if (errorCount.value > 0) return 'error';
	if (degradedCount.value > 0) return 'warning';
	if (healthyCount.value > 0) return 'success';
	return 'grey';
});

const overallStatusIcon = computed(() => {
	if (errorCount.value > 0) return 'mdi-alert-circle';
	if (degradedCount.value > 0) return 'mdi-alert';
	if (healthyCount.value > 0) return 'mdi-check-circle';
	return 'mdi-help-circle';
});

const overallStatusText = computed(() => {
	if (errorCount.value > 0) return 'Some services unavailable';
	if (degradedCount.value > 0) return 'Some services degraded';
	if (healthyCount.value > 0) return 'All services healthy';
	return 'Status unknown';
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
		healthy: 'mdi-check-circle',
		degraded: 'mdi-alert',
		error: 'mdi-alert-circle',
		unknown: 'mdi-help-circle',
	};
	return icons[source.status] || 'mdi-help-circle';
};

const getStatusClass = (status) => {
	return `status-${status}`;
};

const checkHealth = async (sourceId) => {
	const source = dataSources.value.find((s) => s.id === sourceId);
	if (!source) return;

	source.loading = true;
	const startTime = Date.now();

	try {
		// Check cache first
		const cacheKey = `health-${sourceId}`;
		const cached = await cacheService.getData(cacheKey, 5 * 60 * 1000); // 5 minutes

		if (cached) {
			source.cached = true;
			source.cacheAge = cached.age;
			source.cacheSize = new Blob([JSON.stringify(cached.data)]).size;
		}

		// Make health check request
		const response = await fetch(source.url, {
			method: 'GET',
			headers: { Accept: 'application/json' },
		});

		const responseTime = Date.now() - startTime;
		source.responseTime = responseTime;
		source.lastUpdated = Date.now();

		if (response.ok) {
			const data = await response.json();

			// Cache the response
			await cacheService.setData(cacheKey, data, {
				type: source.type,
				ttl: 5 * 60 * 1000, // 5 minutes for health checks
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
			source.message = `HTTP ${response.status}: ${response.statusText}`;
		}
	} catch (error) {
		source.status = 'error';
		source.message = error.message || 'Connection failed';
		source.responseTime = Date.now() - startTime;
	} finally {
		source.loading = false;
	}
};

const refreshAll = async () => {
	refreshing.value = true;

	try {
		// Update cache stats
		cacheStats.value = await cacheService.getCacheStats();

		// Check all sources in parallel
		await Promise.all(dataSources.value.map((source) => checkHealth(source.id)));
	} finally {
		refreshing.value = false;
	}
};

const retrySource = async (sourceId) => {
	const source = dataSources.value.find((s) => s.id === sourceId);
	if (!source) return;

	source.retrying = true;
	await checkHealth(sourceId);
	source.retrying = false;

	emit('source-retry', sourceId);
};

const clearCache = async (sourceId) => {
	const source = dataSources.value.find((s) => s.id === sourceId);
	if (!source) return;

	const cacheKey = `health-${sourceId}`;
	await cacheService.removeData(cacheKey);

	source.cached = false;
	source.cacheAge = null;
	source.cacheSize = null;

	emit('cache-cleared', sourceId);
};

const clearAllCache = async () => {
	await cacheService.clearAll();
	cacheStats.value = await cacheService.getCacheStats();

	dataSources.value.forEach((source) => {
		source.cached = false;
		source.cacheAge = null;
		source.cacheSize = null;
	});

	emit('cache-cleared', 'all');
};

const preloadData = async (sourceId) => {
	emit('data-preload', sourceId);
};

const showDetails = (source) => {
	selectedSource.value = source;
	detailsDialog.value = true;
};

const formatTimestamp = (timestamp) => {
	if (!timestamp) return 'Never';
	return new Date(timestamp).toLocaleString();
};

const formatAge = (age) => {
	if (!age) return 'Unknown';

	const seconds = Math.floor(age / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
};

const formatCacheSize = (bytes) => {
	if (!bytes) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB'];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const getCacheUtilizationColor = (percent) => {
	if (percent > 90) return 'error';
	if (percent > 70) return 'warning';
	return 'success';
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
.data-source-status {
	margin-bottom: 16px;
}

.data-source-status.compact {
	max-height: 200px;
	overflow-y: auto;
}

.status-title {
	font-size: 1rem;
	font-weight: 600;
	padding-bottom: 8px;
}

.status-summary {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px;
	background-color: rgba(0, 0, 0, 0.02);
	border-radius: 6px;
}

.summary-item {
	display: flex;
	align-items: center;
}

.summary-text {
	font-weight: 500;
	margin-left: 4px;
}

.summary-stats {
	display: flex;
	gap: 8px;
}

.source-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.source-item {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 12px;
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 6px;
	transition: background-color 0.2s;
}

.source-item:hover {
	background-color: rgba(0, 0, 0, 0.02);
}

.source-item.compact-item {
	padding: 8px;
}

.source-info {
	flex: 1;
}

.source-header {
	display: flex;
	align-items: center;
	margin-bottom: 4px;
}

.source-name {
	font-weight: 500;
	font-size: 0.9rem;
}

.cache-indicator {
	opacity: 0.7;
}

.compact-details {
	font-size: 0.8rem;
	color: rgba(0, 0, 0, 0.6);
	font-style: italic;
}

.source-details {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-top: 4px;
}

.detail-row {
	display: flex;
	font-size: 0.8rem;
}

.detail-label {
	min-width: 80px;
	color: rgba(0, 0, 0, 0.6);
	font-weight: 500;
}

.detail-value {
	color: rgba(0, 0, 0, 0.87);
}

.cache-info {
	color: #1976d2;
}

.source-actions {
	display: flex;
	gap: 4px;
	align-items: flex-start;
}

.rotating {
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

.status-healthy {
	color: #4caf50;
}
.status-degraded {
	color: #ff9800;
}
.status-error {
	color: #f44336;
}
.status-unknown {
	color: #9e9e9e;
}

.cache-stats {
	padding: 12px;
	background-color: rgba(0, 0, 0, 0.02);
	border-radius: 6px;
}

.cache-stats-title {
	display: flex;
	align-items: center;
	font-size: 0.9rem;
	font-weight: 600;
	margin-bottom: 12px;
}

.stats-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	margin-bottom: 8px;
}

.stat-item {
	display: flex;
	justify-content: space-between;
	font-size: 0.8rem;
}

.stat-label {
	color: rgba(0, 0, 0, 0.6);
}

.stat-value {
	font-weight: 500;
}

.actions-row {
	display: flex;
	align-items: center;
	padding-top: 8px;
	border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.details-content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.detail-section h4 {
	font-size: 1rem;
	font-weight: 600;
	margin-bottom: 8px;
}

.url-cell {
	font-family: monospace;
	font-size: 0.8rem;
	word-break: break-all;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.status-summary {
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}

	.stats-grid {
		grid-template-columns: 1fr;
	}

	.source-item {
		flex-direction: column;
		gap: 8px;
	}

	.source-actions {
		align-self: flex-end;
	}
}
</style>
