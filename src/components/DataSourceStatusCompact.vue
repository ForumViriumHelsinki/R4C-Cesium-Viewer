<template>
  <v-card
    class="status-compact-card"
    :class="{ 'has-errors': hasErrors, 'has-warnings': hasWarnings }"
    elevation="4"
  >
    <!-- Status Summary Header -->
    <v-card-text class="status-header pa-2">
      <div class="status-summary">
        <v-icon
          :color="overallStatusColor"
          size="16"
          class="status-icon"
        >
          {{ overallStatusIcon }}
        </v-icon>

        <span class="status-text">
          {{ healthyCount }}/{{ totalSources }}
        </span>

        <v-btn
          icon
          size="x-small"
          variant="text"
          class="expand-btn"
          @click="showDetails = !showDetails"
        >
          <v-icon size="14">
            {{ showDetails ? 'mdi-chevron-down' : 'mdi-chevron-up' }}
          </v-icon>
        </v-btn>
      </div>
    </v-card-text>

    <!-- Expandable Details -->
    <v-expand-transition>
      <div
v-if="showDetails"
class="status-details"
>
        <v-divider />

        <v-card-text class="pa-2">
          <!-- Individual Source Status -->
          <div
            v-for="source in dataSources"
            :key="source.id"
            class="source-item-compact"
          >
            <div class="source-info-compact">
              <v-icon
                :color="getStatusColor(source.status)"
                size="12"
                class="source-status-icon"
              >
                {{ getStatusIcon(source) }}
              </v-icon>

              <span class="source-name-compact">{{ source.name }}</span>

              <!-- Cache indicator -->
              <v-icon
                v-if="source.cached"
                size="10"
                color="blue"
                class="cache-icon"
              >
                mdi-cached
              </v-icon>

              <!-- Response time -->
              <span
                v-if="source.responseTime"
                class="response-time"
                :class="getResponseTimeClass(source.responseTime)"
              >
                {{ source.responseTime }}ms
              </span>
            </div>

            <!-- Error message -->
            <div
v-if="source.status === 'error'"
class="error-msg"
>
              {{ source.message }}
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <v-btn
              size="x-small"
              variant="text"
              :loading="refreshing"
              class="action-btn"
              @click="refreshAll"
            >
              <v-icon
size="12"
class="mr-1"
>
mdi-refresh
</v-icon>
              Refresh
            </v-btn>

            <v-btn
              v-if="hasCachedData"
              size="x-small"
              variant="text"
              color="warning"
              class="action-btn"
              @click="clearAllCache"
            >
              <v-icon
size="12"
class="mr-1"
>
mdi-delete-sweep
</v-icon>
              Clear Cache
            </v-btn>
          </div>
        </v-card-text>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import cacheService from '../services/cacheService';

// Props
const props = defineProps({
  refreshInterval: {
    type: Number,
    default: 30000 // 30 seconds
  }
});

// Emits
const emit = defineEmits(['source-retry', 'cache-cleared']);

// Local state
const refreshing = ref(false);
const showDetails = ref(false);
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
    responseTime: null
  },
  {
    id: 'hsy-action',
    name: 'HSY Environmental',
    url: '/hsy-action?action_route=GetHierarchicalMapLayerGroups',
    status: 'unknown',
    message: 'Not checked',
    loading: false,
    cached: false,
    responseTime: null
  },
  {
    id: 'paavo',
    name: 'Statistics Finland',
    url: '/paavo',
    status: 'unknown',
    message: 'Not checked',
    loading: false,
    cached: false,
    responseTime: null
  },
  {
    id: 'digitransit',
    name: 'Digitransit API',
    url: '/digitransit/geocoding/v1/search?text=Helsinki',
    status: 'unknown',
    message: 'Not checked',
    loading: false,
    cached: false,
    responseTime: null
  }
]);

// Computed properties
const totalSources = computed(() => dataSources.value.length);

const healthyCount = computed(() =>
  dataSources.value.filter(s => s.status === 'healthy').length
);

const hasErrors = computed(() =>
  dataSources.value.some(s => s.status === 'error')
);

const hasWarnings = computed(() =>
  dataSources.value.some(s => s.status === 'degraded')
);

const hasCachedData = computed(() =>
  dataSources.value.some(s => s.cached)
);

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
    unknown: 'grey'
  };
  return colors[status] || 'grey';
};

const getStatusIcon = (source) => {
  if (source.loading) return 'mdi-loading';

  const icons = {
    healthy: 'mdi-check',
    degraded: 'mdi-alert',
    error: 'mdi-close',
    unknown: 'mdi-help'
  };
  return icons[source.status] || 'mdi-help';
};

const getResponseTimeClass = (responseTime) => {
  if (responseTime > 5000) return 'response-slow';
  if (responseTime > 2000) return 'response-medium';
  return 'response-fast';
};

const checkHealth = async (sourceId) => {
  const source = dataSources.value.find(s => s.id === sourceId);
  if (!source) return;

  source.loading = true;
  const startTime = Date.now();

  try {
    // Check cache first
    const cacheKey = `health-${sourceId}`;
    const cached = await cacheService.getData(cacheKey, 5 * 60 * 1000);

    if (cached) {
      source.cached = true;
    }

    // Make health check request
    const response = await fetch(source.url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const responseTime = Date.now() - startTime;
    source.responseTime = responseTime;

    if (response.ok) {
      const data = await response.json();

      // Cache the response
      await cacheService.setData(cacheKey, data, {
        type: source.id,
        ttl: 5 * 60 * 1000 // 5 minutes for health checks
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
    // Check all sources in parallel
    await Promise.all(dataSources.value.map(source => checkHealth(source.id)));
  } finally {
    refreshing.value = false;
  }
};

const clearAllCache = async () => {
  await cacheService.clearAll();

  dataSources.value.forEach(source => {
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
.status-compact-card {
  border-radius: 8px;
  backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
}

.status-compact-card.has-errors {
  border-left: 3px solid #f44336;
}

.status-compact-card.has-warnings {
  border-left: 3px solid #ff9800;
}

.status-header {
  min-height: 32px;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  flex-shrink: 0;
}

.status-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
  flex: 1;
}

.expand-btn {
  flex-shrink: 0;
}

.status-details {
  max-height: 200px;
  overflow-y: auto;
}

.source-item-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.source-item-compact:last-child {
  border-bottom: none;
}

.source-info-compact {
  display: flex;
  align-items: center;
  gap: 6px;
}

.source-status-icon {
  flex-shrink: 0;
}

.source-name-compact {
  font-size: 0.75rem;
  font-weight: 500;
  flex: 1;
  color: rgba(0, 0, 0, 0.87);
}

.cache-icon {
  flex-shrink: 0;
  opacity: 0.7;
}

.response-time {
  font-size: 0.7rem;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
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
  font-size: 0.7rem;
  color: #f44336;
  font-style: italic;
  margin-left: 18px;
}

.quick-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.action-btn {
  font-size: 0.7rem !important;
  height: 24px !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .status-compact-card {
    font-size: 0.8rem;
  }

  .source-name-compact {
    font-size: 0.7rem;
  }

  .response-time {
    display: none; /* Hide on small screens */
  }
}

/* Animation for loading states */
.source-status-icon.mdi-loading {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
