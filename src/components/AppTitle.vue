<template>
	<v-tooltip
		location="bottom"
		content-class="app-title-tooltip"
	>
		<template #activator="{ props }">
			<div
				v-bind="props"
				class="app-title-container"
			>
				<span class="app-title">Regions4Climate</span>
				<span class="app-version">v{{ versionInfo.version }}</span>
			</div>
		</template>
		<template #default>
			<div class="tooltip-content">
				<div class="tooltip-header">Version Information</div>
				<v-divider class="my-2" />
				<div class="tooltip-row">
					<span class="tooltip-label">Version:</span>
					<span class="tooltip-value">{{ versionInfo.version }}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Commit:</span>
					<span class="tooltip-value monospace">{{ versionInfo.commit }}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Full Hash:</span>
					<span class="tooltip-value monospace small">{{ versionInfo.commitFull }}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Commit Date:</span>
					<span class="tooltip-value">{{ formattedCommitDate }}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Branch:</span>
					<span class="tooltip-value">{{ versionInfo.branch }}</span>
				</div>
				<div class="tooltip-row">
					<span class="tooltip-label">Build Date:</span>
					<span class="tooltip-value">{{ formattedBuildTime }}</span>
				</div>
			</div>
		</template>
	</v-tooltip>
</template>

<script setup>
import { computed } from 'vue';
import { VERSION_INFO } from '../version.js';

const versionInfo = VERSION_INFO;

const formattedCommitDate = computed(() => {
	try {
		return new Date(versionInfo.commitDate).toLocaleString();
	} catch {
		return versionInfo.commitDate;
	}
});

const formattedBuildTime = computed(() => {
	try {
		return new Date(versionInfo.buildTime).toLocaleString();
	} catch {
		return versionInfo.buildTime;
	}
});
</script>

<style scoped>
.app-title-container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	cursor: help;
	padding: 4px 8px;
	border-radius: 4px;
	transition: background-color 0.2s ease;
}

.app-title-container:hover {
	background-color: rgba(0, 0, 0, 0.04);
}

.app-title {
	font-size: 0.875rem;
	font-weight: 600;
	color: rgba(0, 0, 0, 0.87);
	line-height: 1.2;
}

.app-version {
	font-size: 0.75rem;
	color: rgba(0, 0, 0, 0.5);
	font-family: 'Courier New', monospace;
	line-height: 1.2;
}

.tooltip-content {
	padding: 8px 4px;
	min-width: 280px;
}

.tooltip-header {
	font-weight: 600;
	font-size: 0.875rem;
	margin-bottom: 4px;
}

.tooltip-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 4px 0;
	gap: 12px;
}

.tooltip-label {
	font-weight: 500;
	color: rgba(255, 255, 255, 0.7);
	white-space: nowrap;
	font-size: 0.75rem;
}

.tooltip-value {
	text-align: right;
	word-break: break-word;
	font-size: 0.75rem;
}

.tooltip-value.monospace {
	font-family: 'Courier New', monospace;
}

.tooltip-value.small {
	font-size: 0.65rem;
	max-width: 180px;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
	.app-title {
		font-size: 0.75rem;
	}

	.app-version {
		font-size: 0.6rem;
	}

	.tooltip-content {
		min-width: 240px;
	}
}
</style>

<style>
/* Global styles for the tooltip content class */
.app-title-tooltip {
	background-color: rgba(33, 33, 33, 0.95) !important;
}
</style>
