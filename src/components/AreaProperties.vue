<template>
	<div
		class="area-properties"
		role="region"
		:aria-label="`${totalPropertyCount} properties for selected ${entityType}`"
	>
		<!-- Empty State -->
		<div
			v-if="!hasEntity"
			class="empty-state"
			role="status"
			aria-live="polite"
		>
			<v-icon
				size="small"
				class="mr-1"
			>
				mdi-cursor-default-click
			</v-icon>
			<span class="text-body-2">Click on areas to view properties</span>
		</div>

		<!-- Property Content -->
		<template v-else>
			<!-- Compact Summary Header -->
			<div class="summary-header">
				<div class="summary-chips">
					<v-chip
						v-for="prop in keyProperties"
						:key="prop.key"
						size="small"
						variant="tonal"
						:color="prop.color || 'default'"
						class="summary-chip"
					>
						<v-icon
							v-if="prop.icon"
							size="x-small"
							start
						>
							{{ prop.icon }}
						</v-icon>
						<span class="chip-label">{{ prop.label }}:</span>
						<span class="chip-value">{{ prop.displayValue }}</span>
					</v-chip>
				</div>
			</div>

			<!-- Search Filter (only shows with 10+ properties) -->
			<div
				v-if="totalPropertyCount >= 10"
				class="filter-row"
			>
				<v-text-field
					v-model="searchQuery"
					density="compact"
					variant="outlined"
					placeholder="Filter properties..."
					prepend-inner-icon="mdi-magnify"
					clearable
					hide-details
					class="filter-input"
					aria-label="Filter properties"
				/>
			</div>

			<!-- Categorized Properties -->
			<v-expansion-panels
				v-model="openPanels"
				multiple
				variant="accordion"
				class="property-panels"
			>
				<v-expansion-panel
					v-for="category in filteredCategories"
					:key="category.id"
					:value="category.id"
					class="property-panel"
				>
					<v-expansion-panel-title class="panel-title">
						<v-icon
							size="small"
							class="mr-2"
						>
							{{ category.icon }}
						</v-icon>
						<span class="category-name">{{ category.name }}</span>
						<v-chip
							size="x-small"
							variant="text"
							class="ml-auto category-count"
						>
							{{ category.properties.length }}
						</v-chip>
					</v-expansion-panel-title>

					<v-expansion-panel-text class="panel-content">
						<div
							v-for="prop in category.properties"
							:key="prop.key"
							class="property-row"
						>
							<span class="property-key">{{ prop.label }}</span>
							<span class="property-value">{{ prop.displayValue }}</span>
							<v-btn
								size="x-small"
								variant="text"
								icon="mdi-content-copy"
								density="compact"
								class="copy-btn"
								:aria-label="`Copy ${prop.label}`"
								@click.stop="copyValue(prop.value, prop.label)"
							/>
						</div>
					</v-expansion-panel-text>
				</v-expansion-panel>
			</v-expansion-panels>

			<!-- Copy All Button -->
			<div class="actions-row">
				<v-btn
					size="small"
					variant="text"
					prepend-icon="mdi-content-copy"
					class="copy-all-btn"
					@click="copyAllProperties"
				>
					Copy All
				</v-btn>
			</div>
		</template>

		<!-- Copy Feedback Snackbar -->
		<v-snackbar
			v-model="showCopyFeedback"
			:timeout="1500"
			location="bottom"
			color="success"
		>
			{{ copyFeedbackText }}
		</v-snackbar>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import { eventBus } from '../services/eventEmitter';

const globalStore = useGlobalStore();
const searchQuery = ref('');
const openPanels = ref([]);
const showCopyFeedback = ref(false);
const copyFeedbackText = ref('Copied!');

// Category definitions with property matchers
const CATEGORIES = {
	location: {
		id: 'location',
		name: 'Location',
		icon: 'mdi-map-marker',
		order: 1,
		matchers: [
			'posno',
			'nimi',
			'name',
			'katu',
			'katunimi',
			'osoite',
			'osno',
			'oski',
			'postinumero',
		],
	},
	climate: {
		id: 'climate',
		name: 'Climate & Heat',
		icon: 'mdi-thermometer',
		order: 2,
		matchers: ['heat', 'temp', 'lst', 'exposure', 'distance'],
	},
	building: {
		id: 'building',
		name: 'Building',
		icon: 'mdi-home-city',
		order: 3,
		matchers: [
			'height',
			'kerr',
			'floor',
			'year',
			'valm',
			'rakennusaine',
			'rakeaine',
			'julkisivu',
			'kayttotarkoitus',
			'kayttark',
			'roof',
			'lamm',
			'polt',
		],
	},
	vegetation: {
		id: 'vegetation',
		name: 'Vegetation',
		icon: 'mdi-tree',
		order: 4,
		matchers: ['tree', 'vegetation', 'green', 'ndvi', 'p_ala', 'korkeus', 'water'],
	},
	demographics: {
		id: 'demographics',
		name: 'Demographics',
		icon: 'mdi-account-group',
		order: 5,
		matchers: ['pop', 'asukk', 'vaesto'],
	},
	other: {
		id: 'other',
		name: 'Other',
		icon: 'mdi-dots-horizontal',
		order: 99,
		matchers: [],
	},
};

// Key properties to show in summary (by priority)
const KEY_PROPERTY_CONFIG = {
	posno: { label: 'Postal', icon: 'mdi-map-marker', color: 'primary' },
	nimi: { label: 'Area', icon: null, color: 'default' },
	avgheatexposuretobuilding: { label: 'Heat', icon: 'mdi-thermometer', color: 'warning' },
	averageheatexposure: { label: 'Heat', icon: 'mdi-thermometer', color: 'warning' },
	avg_temp_c: { label: 'Temp', icon: 'mdi-thermometer', color: 'error' },
	asukkaita: { label: 'Pop', icon: 'mdi-account-group', color: 'info' },
	area_m2: { label: 'Area', icon: 'mdi-vector-square', color: 'default' },
	measured_height: { label: 'Height', icon: 'mdi-arrow-expand-vertical', color: 'default' },
	i_kerrlkm: { label: 'Floors', icon: 'mdi-layers', color: 'default' },
};

// Properties to exclude from display
const EXCLUDED_PATTERNS = [
	'fid',
	'_id',
	'value',
	'gml_parent',
	'_x',
	'_y',
	'heat_timeseries',
	'travel_data',
	'locationunder40',
	'_locationunder40',
];

// Check if property should be excluded
function shouldExclude(key) {
	const lowerKey = key.toLowerCase();
	if (lowerKey === 'id') return true;
	if (lowerKey.endsWith('id') && lowerKey !== 'grid_id') return true;
	return EXCLUDED_PATTERNS.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

// Find category for a property key
function findCategory(key) {
	const lowerKey = key.toLowerCase();
	for (const [catId, cat] of Object.entries(CATEGORIES)) {
		if (catId === 'other') continue;
		if (cat.matchers.some((m) => lowerKey.includes(m))) {
			return catId;
		}
	}
	return 'other';
}

// Format property label for display
function formatLabel(key) {
	// Common abbreviation mappings
	const labelMap = {
		posno: 'Postal Code',
		nimi: 'Name',
		avgheatexposuretobuilding: 'Heat Exposure',
		averageheatexposure: 'Heat Exposure',
		avg_temp_c: 'Temperature (°C)',
		measured_height: 'Height (m)',
		i_kerrlkm: 'Floors',
		kerrosten_lkm: 'Floors',
		area_m2: 'Area (m²)',
		asukkaita: 'Population',
		katunimi_suomi: 'Street',
		osoitenumero: 'Street No.',
		year_of_construction: 'Year Built',
		kayttotarkoitus: 'Building Use',
		rakennusaine_s: 'Material',
		tree_cover_m2: 'Tree Cover (m²)',
		vegetation_m2: 'Vegetation (m²)',
		water_m2: 'Water (m²)',
		distancetounder40: 'Dist. to Cool Area',
		p_ala_m2: 'Tree Area (m²)',
		korkeus_ka_m: 'Tree Height (m)',
		grid_id: 'Grid ID',
	};

	if (labelMap[key]) return labelMap[key];

	// Auto-format: replace underscores, capitalize
	return key
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Format value for display
function formatValue(value) {
	if (value === null || value === undefined) return '-';
	if (typeof value === 'number') {
		if (Number.isInteger(value)) return value.toString();
		return value.toFixed(2);
	}
	return String(value);
}

// Extract all properties from entity
const allProperties = computed(() => {
	const entity = globalStore.pickedEntity;
	if (!entity?._properties) return [];

	const props = [];

	// Add vtj_prt from entity ID if applicable
	const entityId = String(entity._id || '');
	if (entityId.length === 10) {
		props.push({
			key: 'vtj_prt',
			label: 'Building ID',
			value: entityId,
			displayValue: entityId,
			category: 'location',
		});
	}

	// Extract properties
	const propertyNames = entity._properties._propertyNames || [];
	propertyNames.forEach((key) => {
		if (shouldExclude(key)) return;

		const rawValue = entity._properties[key]?._value;
		if (rawValue === null || rawValue === undefined) return;
		if (typeof rawValue === 'object') return; // Skip complex objects

		props.push({
			key,
			label: formatLabel(key),
			value: rawValue,
			displayValue: formatValue(rawValue),
			category: findCategory(key),
		});
	});

	return props;
});

// Key properties for summary header (max 3-4)
const keyProperties = computed(() => {
	const result = [];
	const priorityKeys = Object.keys(KEY_PROPERTY_CONFIG);

	for (const key of priorityKeys) {
		if (result.length >= 3) break;
		const prop = allProperties.value.find((p) => p.key === key);
		if (prop) {
			const config = KEY_PROPERTY_CONFIG[key];
			result.push({
				...prop,
				label: config.label,
				icon: config.icon,
				color: config.color,
			});
		}
	}

	return result;
});

// Categorized properties
const categorizedProperties = computed(() => {
	const categories = {};

	// Initialize categories
	Object.values(CATEGORIES).forEach((cat) => {
		categories[cat.id] = { ...cat, properties: [] };
	});

	// Assign properties to categories
	allProperties.value.forEach((prop) => {
		// Skip key properties (already shown in summary)
		if (KEY_PROPERTY_CONFIG[prop.key]) return;

		const catId = prop.category;
		if (categories[catId]) {
			categories[catId].properties.push(prop);
		}
	});

	// Filter empty and sort by order
	return Object.values(categories)
		.filter((cat) => cat.properties.length > 0)
		.sort((a, b) => a.order - b.order);
});

// Apply search filter
const filteredCategories = computed(() => {
	if (!searchQuery.value) return categorizedProperties.value;

	const query = searchQuery.value.toLowerCase();
	return categorizedProperties.value
		.map((cat) => ({
			...cat,
			properties: cat.properties.filter(
				(p) => p.label.toLowerCase().includes(query) || p.displayValue.toLowerCase().includes(query)
			),
		}))
		.filter((cat) => cat.properties.length > 0);
});

const hasEntity = computed(() => allProperties.value.length > 0);
const totalPropertyCount = computed(() => allProperties.value.length);
const entityType = computed(() => {
	if (globalStore.level === 'building') return 'building';
	if (globalStore.level === 'postalCode') return 'postal code';
	return 'area';
});

// Copy single value
async function copyValue(value, label) {
	try {
		await navigator.clipboard.writeText(String(value));
		copyFeedbackText.value = `${label} copied`;
		showCopyFeedback.value = true;
	} catch (err) {
		console.error('Copy failed:', err);
	}
}

// Copy all properties
async function copyAllProperties() {
	const lines = allProperties.value.map((p) => `${p.label}: ${p.value}`);
	try {
		await navigator.clipboard.writeText(lines.join('\n'));
		copyFeedbackText.value = `${lines.length} properties copied`;
		showCopyFeedback.value = true;
	} catch (err) {
		console.error('Copy failed:', err);
	}
}

// Reset panels when entity changes
watch(
	() => globalStore.pickedEntity,
	() => {
		openPanels.value = [];
		searchQuery.value = '';
	}
);

// Listen for entity events
eventBus.on('entityPrintEvent', () => {
	openPanels.value = [];
});
</script>

<style scoped>
.area-properties {
	font-size: 0.8125rem;
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12px;
	color: rgba(0, 0, 0, 0.6);
	font-style: italic;
}

.summary-header {
	margin-bottom: 8px;
}

.summary-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.summary-chip {
	font-size: 0.75rem;
	height: 24px;
}

.chip-label {
	opacity: 0.8;
	margin-right: 2px;
}

.chip-value {
	font-weight: 500;
}

.filter-row {
	margin-bottom: 8px;
}

.filter-input {
	font-size: 0.8125rem;
}

.filter-input :deep(.v-field__input) {
	padding-top: 4px;
	padding-bottom: 4px;
	min-height: 32px;
}

.property-panels {
	margin: 0 -8px;
}

.property-panel {
	background: transparent;
}

.property-panel :deep(.v-expansion-panel-title) {
	min-height: 36px;
	padding: 8px 12px;
	font-size: 0.8125rem;
}

.property-panel :deep(.v-expansion-panel-text__wrapper) {
	padding: 0 12px 8px;
}

.category-name {
	font-weight: 500;
}

.category-count {
	font-size: 0.75rem;
	opacity: 0.7;
}

.property-row {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 4px 0;
	border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.property-row:last-child {
	border-bottom: none;
}

.property-key {
	flex: 0 0 auto;
	min-width: 100px;
	max-width: 120px;
	font-size: 0.75rem;
	color: rgba(0, 0, 0, 0.6);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.property-value {
	flex: 1;
	font-family: 'Roboto Mono', monospace;
	font-size: 0.75rem;
	color: rgba(0, 0, 0, 0.87);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.copy-btn {
	flex: 0 0 auto;
	opacity: 0;
	transition: opacity 0.15s;
}

.property-row:hover .copy-btn {
	opacity: 0.6;
}

.copy-btn:hover {
	opacity: 1 !important;
}

.actions-row {
	display: flex;
	justify-content: flex-end;
	margin-top: 4px;
	padding-top: 4px;
	border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.copy-all-btn {
	font-size: 0.75rem;
	text-transform: none;
}

/* Reduce expansion panel visual weight */
.property-panel :deep(.v-expansion-panel-title__overlay) {
	opacity: 0.02;
}
</style>
