<template>
	<v-navigation-drawer
		v-if="drawerOpen"
		v-model="drawerOpen"
		eager
		location="left"
		width="300"
		temporary
		class="climate-adaption-panel"
		role="dialog"
		aria-labelledby="climate-adaptation-title"
		aria-describedby="climate-adaptation-description"
	>
		<v-card
			flat
			class="d-flex flex-column"
			style="height: 100%"
		>
			<!-- Header -->
			<v-card-title
				id="climate-adaptation-title"
				class="d-flex align-center"
			>
				<span
					id="climate-adaptation-description"
					class="sr-only"
				>
					Climate adaptation tools for analyzing cooling centers and green spaces. Use Tab key to
					navigate between sections.
				</span>
				<v-icon
					class="mr-2"
					aria-hidden="true"
				>
					mdi-shield-sun
				</v-icon>
				Climate Adaptation
				<v-spacer />
				<v-btn
					icon="mdi-close"
					variant="text"
					aria-label="Close climate adaptation panel"
					@click="drawerOpen = false"
				/>
			</v-card-title>

			<!-- Tabs -->
			<v-tabs
				v-model="tab"
				grow
				role="tablist"
				aria-label="Climate adaptation tool sections"
			>
				<v-tab
					value="centers"
					role="tab"
					:aria-selected="tab === 'centers'"
					aria-controls="tab-panel-centers"
				>
					Cooling Centers
				</v-tab>
				<v-tab
					value="optimizer"
					role="tab"
					:aria-selected="tab === 'optimizer'"
					aria-controls="tab-panel-optimizer"
				>
					Optimizer
				</v-tab>
				<v-tab
					value="parks"
					role="tab"
					:aria-selected="tab === 'parks'"
					aria-controls="tab-panel-parks"
				>
					Green Spaces
				</v-tab>
			</v-tabs>

			<!-- Content -->
			<v-card-text class="flex-grow-1 overflow-y-auto">
				<v-window
					v-model="tab"
					role="tabpanel"
				>
					<v-window-item
						id="tab-panel-centers"
						value="centers"
						class="pa-1"
						role="tabpanel"
						:aria-hidden="tab !== 'centers'"
						aria-labelledby="tab-centers"
						tabindex="-1"
					>
						<CoolingCenter />
					</v-window-item>
					<v-window-item
						id="tab-panel-optimizer"
						value="optimizer"
						class="pa-1"
						role="tabpanel"
						:aria-hidden="tab !== 'optimizer'"
						aria-labelledby="tab-optimizer"
						tabindex="-1"
					>
						<CoolingCenterOptimiser />
					</v-window-item>
					<v-window-item
						id="tab-panel-parks"
						value="parks"
						class="pa-1"
						role="tabpanel"
						:aria-hidden="tab !== 'parks'"
						aria-labelledby="tab-parks"
						tabindex="-1"
					>
						<LandcoverToParks />
					</v-window-item>
				</v-window>

				<div class="pa-2 mt-2">
					<EstimatedImpacts />
				</div>
			</v-card-text>
		</v-card>
	</v-navigation-drawer>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import CoolingCenter from './CoolingCenter.vue'
import CoolingCenterOptimiser from './CoolingCenterOptimiser.vue'
import EstimatedImpacts from './EstimatedImpacts.vue'
import LandcoverToParks from './LandcoverToParks.vue'

// Props + emits
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const tab = ref('centers')

// Use computed property for v-model synchronization (better performance)
const drawerOpen = computed({
	get() {
		return props.modelValue
	},
	set(value) {
		emit('update:modelValue', value)
	},
})

// Focus management when switching tabs
watch(tab, async (newTab) => {
	await nextTick()
	// Focus the active tab panel for better keyboard navigation
	const tabPanel = document.getElementById(`tab-panel-${newTab}`)
	if (tabPanel) {
		tabPanel.focus()
	}
})

// Focus management when drawer opens
watch(
	() => props.modelValue,
	async (isOpen) => {
		if (isOpen) {
			await nextTick()
			// Focus the first tab when drawer opens
			const firstTab = document.querySelector('.climate-adaption-panel [role="tab"]')
			if (firstTab) {
				firstTab.focus()
			}
		}
	}
)
</script>

<style scoped>
.climate-adaption-panel {
	z-index: 2400;
}

.climate-adaption-panel .v-card {
	height: 100%;
	border-radius: 0;
}

/* Screen reader only content */
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
</style>
