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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import cacheService from '../services/cacheService'
import logger from '../utils/logger.js'

// Props
const props = defineProps({
	refreshInterval: {
		type: Number,
		default: 30000,
	},
})

// Emits
const emit = defineEmits(['source-retry', 'cache-cleared'])

// Local state
const refreshing = ref(false)
const refreshTimer = ref(/** @type {ReturnType<typeof setInterval> | null} */ (null))
let unmounted = false

/**
 * @typedef {object} DataSource
 * @property {string} id
 * @property {string} name
 * @property {string} url
 * @property {'GET' | 'HEAD'} method
 * @property {string} status
 * @property {string} message
 * @property {boolean} loading
 * @property {number | null} responseTime
 */

// Data sources to monitor. Each probe is the smallest request that still
// proves the upstream answers with JSON (#997): the badge reports
// reachability, so it never reads or caches a response body.
// - hsy-action has no small variant (the action returns the whole layer
//   tree, ~317 KB), so it is probed with HEAD. kartta.hsy.fi answers HEAD
//   with 200 application/json; the Vite proxy forwards HEAD unchanged, and
//   nginx's cached /hsy-action location converts it to a cacheable GET
//   upstream (proxy_cache_convert_head) and returns headers only.
// - paavo takes WFS `count=1` (~5 KB instead of ~796 KB); both proxies keep
//   the query string after their fixed WFS parameters.
// - digitransit answers HEAD with 404, so it stays a keyed GET with `size=1`,
//   the same request as nginx's /status/digitransit check.
const dataSources = ref(
	/** @type {DataSource[]} */ ([
		{
			id: 'pygeoapi',
			name: 'PyGeoAPI',
			url: '/pygeoapi/collections/heatexposure_optimized/items?f=json&limit=1',
			method: 'GET',
			status: 'unknown',
			message: 'Not checked',
			loading: false,
			responseTime: null,
		},
		{
			id: 'hsy-action',
			name: 'HSY Environmental',
			url: '/hsy-action?action_route=GetHierarchicalMapLayerGroups',
			method: 'HEAD',
			status: 'unknown',
			message: 'Not checked',
			loading: false,
			responseTime: null,
		},
		{
			id: 'paavo',
			name: 'Statistics Finland',
			url: '/paavo?count=1',
			method: 'GET',
			status: 'unknown',
			message: 'Not checked',
			loading: false,
			responseTime: null,
		},
		{
			id: 'digitransit',
			name: 'Digitransit API',
			url: '/digitransit/geocoding/v1/search?text=Helsinki&size=1',
			method: 'GET',
			status: 'unknown',
			message: 'Not checked',
			loading: false,
			responseTime: null,
		},
	])
)

// Computed properties
const totalSources = computed(() => dataSources.value.length)
const healthyCount = computed(() => dataSources.value.filter((s) => s.status === 'healthy').length)
const hasErrors = computed(() => dataSources.value.some((s) => s.status === 'error'))
const hasWarnings = computed(() => dataSources.value.some((s) => s.status === 'degraded'))

const overallStatusColor = computed(() => {
	if (hasErrors.value) return 'error'
	if (hasWarnings.value) return 'warning'
	if (healthyCount.value > 0) return 'success'
	return 'grey'
})

const overallStatusIcon = computed(() => {
	if (hasErrors.value) return 'mdi-alert-circle'
	if (hasWarnings.value) return 'mdi-alert'
	if (healthyCount.value > 0) return 'mdi-check-circle'
	return 'mdi-help-circle'
})

// Methods
const getStatusColor = (status) => {
	const colors = {
		healthy: 'success',
		degraded: 'warning',
		error: 'error',
		loading: 'info',
		unknown: 'grey',
	}
	return colors[status] || 'grey'
}

const getStatusIcon = (source) => {
	if (source.loading) return 'mdi-loading'

	const icons = {
		healthy: 'mdi-check',
		degraded: 'mdi-alert',
		error: 'mdi-close',
		unknown: 'mdi-help',
	}
	return icons[source.status] || 'mdi-help'
}

const getResponseTimeClass = (responseTime) => {
	if (responseTime > 5000) return 'response-slow'
	if (responseTime > 2000) return 'response-medium'
	return 'response-fast'
}

/**
 * Release the response body without reading it. The status line and headers
 * are all a reachability probe needs.
 * @param {Response} response
 */
const discardBody = (response) => {
	response.body?.cancel().catch((error) => {
		logger.debug('Failed to cancel health probe body:', error)
	})
}

const checkHealth = async (sourceId) => {
	const source = dataSources.value.find((s) => s.id === sourceId)
	if (!source) return

	source.loading = true
	const startTime = Date.now()

	try {
		const response = await fetch(source.url, {
			method: source.method,
			headers: { Accept: 'application/json' },
		})
		discardBody(response)

		const responseTime = Date.now() - startTime
		source.responseTime = responseTime

		const contentType = response.headers.get('content-type') ?? ''

		if (!response.ok) {
			source.status = 'error'
			source.message = `HTTP ${response.status}`
		} else if (!contentType.toLowerCase().includes('json')) {
			// A 2xx text/html answer is the SPA catch-all, not the upstream.
			source.status = 'error'
			source.message = `Unexpected content type (${contentType || 'missing'})`
		} else if (responseTime > 5000) {
			source.status = 'degraded'
			source.message = `Slow response (${responseTime}ms)`
		} else {
			source.status = 'healthy'
			source.message = `Responsive (${responseTime}ms)`
		}
	} catch (error) {
		source.status = 'error'
		source.message = error.message.includes('fetch') ? 'Connection failed' : error.message
		source.responseTime = Date.now() - startTime
	} finally {
		source.loading = false
	}
}

const refreshAll = async () => {
	refreshing.value = true

	try {
		await Promise.all(dataSources.value.map((source) => checkHealth(source.id)))
	} finally {
		refreshing.value = false
	}
}

const runBackgroundRefresh = () => {
	if (refreshing.value) return
	refreshAll().catch((error) => {
		logger.error('Data source health refresh failed:', error)
	})
}

const clearAllCache = async () => {
	await cacheService.clearAll()
	emit('cache-cleared', 'all')
}

const stopRefreshTimer = () => {
	if (refreshTimer.value) {
		clearInterval(refreshTimer.value)
		refreshTimer.value = null
	}
}

const startRefreshTimer = () => {
	stopRefreshTimer()
	refreshTimer.value = setInterval(runBackgroundRefresh, props.refreshInterval)
}

// No checks run while the tab is hidden; returning to it runs one check and
// restarts the interval.
const handleVisibilityChange = () => {
	if (document.hidden) {
		stopRefreshTimer()
		return
	}
	runBackgroundRefresh()
	startRefreshTimer()
}

// Lifecycle
onMounted(async () => {
	document.addEventListener('visibilitychange', handleVisibilityChange)
	if (document.hidden) return

	await refreshAll()
	// The tab may have been hidden, or the component unmounted, while the
	// first check was in flight.
	if (!unmounted && !document.hidden) startRefreshTimer()
})

onUnmounted(() => {
	unmounted = true
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	stopRefreshTimer()
})
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
	background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.response-time {
	font-family: monospace;
	padding: 2px 6px;
	border-radius: 3px;
	font-size: 0.7rem;
}

.response-fast {
	background-color: rgba(var(--v-theme-success), 0.1);
	color: rgb(var(--v-theme-success));
}

.response-medium {
	background-color: rgba(var(--v-theme-warning), 0.1);
	color: rgb(var(--v-theme-warning));
}

.response-slow {
	background-color: rgba(var(--v-theme-error), 0.1);
	color: rgb(var(--v-theme-error));
}

.error-msg {
	color: rgb(var(--v-theme-error));
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
