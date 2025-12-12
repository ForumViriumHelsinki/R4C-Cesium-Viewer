<template>
	<v-tooltip
		location="bottom"
		:text="`Version ${versionInfo.version} (${versionInfo.commit})\nBuilt: ${formattedBuildTime}`"
	>
		<template #activator="{ props }">
			<div
				v-bind="props"
				class="version-badge"
			>
				<v-icon
					size="x-small"
					class="mr-1"
				>
					mdi-information-outline
				</v-icon>
				<span class="version-text">v{{ versionInfo.version }}</span>
			</div>
		</template>
	</v-tooltip>
</template>

<script>
import { VERSION_INFO } from '../version.js'

export default {
	name: 'VersionBadge',
	data() {
		return {
			versionInfo: VERSION_INFO,
		}
	},
	computed: {
		formattedBuildTime() {
			try {
				return new Date(this.versionInfo.buildTime).toLocaleString()
			} catch {
				return this.versionInfo.buildTime
			}
		},
	},
}
</script>

<style scoped>
.version-badge {
	position: fixed;
	top: 8px;
	right: 8px;
	background: rgba(0, 0, 0, 0.6);
	color: rgba(255, 255, 255, 0.8);
	padding: 4px 8px;
	border-radius: 4px;
	font-size: 11px;
	z-index: 1000;
	display: flex;
	align-items: center;
	cursor: help;
	backdrop-filter: blur(4px);
	transition: all 0.2s ease;
}

.version-badge:hover {
	background: rgba(0, 0, 0, 0.8);
	color: rgba(255, 255, 255, 1);
}

.version-text {
	font-family: 'Courier New', monospace;
	font-weight: 500;
}
</style>
