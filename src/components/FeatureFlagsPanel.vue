<template>
	<v-dialog v-model="dialog" max-width="800" scrollable>
		<template #activator="{ props }">
			<v-btn
				v-bind="props"
				icon
				variant="text"
				size="small"
				:title="'Feature Flags (' + featureFlagStore.enabledCount + ' enabled)'"
			>
				<v-icon>mdi-flag-variant</v-icon>
			</v-btn>
		</template>

		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon left class="mr-2"> mdi-flag-variant </v-icon>
				Feature Flags
				<v-spacer />
				<v-chip size="small" color="primary">
					{{ featureFlagStore.enabledCount }} / {{ totalFlags }} enabled
				</v-chip>
			</v-card-title>

			<v-card-subtitle>
				Configure runtime feature flags for the application. Changes are saved to your browser.
			</v-card-subtitle>

			<v-divider />

			<v-card-text style="max-height: 500px">
				<v-expansion-panels variant="accordion">
					<v-expansion-panel v-for="category in categories" :key="category" :value="category">
						<v-expansion-panel-title>
							<div class="d-flex align-center">
								<v-icon :icon="getCategoryIcon(category)" class="mr-2" />
								<span class="text-subtitle-1 font-weight-medium">
									{{ getCategoryLabel(category) }}
								</span>
								<v-chip size="x-small" color="grey" class="ml-2">
									{{ getCategoryEnabledCount(category) }} / {{ getCategoryTotalCount(category) }}
								</v-chip>
							</div>
						</v-expansion-panel-title>

						<v-expansion-panel-text>
							<v-list>
								<v-list-item
									v-for="flag in featureFlagStore.flagsByCategory(category)"
									:key="flag.name"
									:disabled="flag.requiresSupport && !checkHardwareSupport(flag)"
								>
									<template #prepend>
										<v-switch
											:model-value="featureFlagStore.isEnabled(flag.name)"
											color="primary"
											hide-details
											:disabled="flag.requiresSupport && !checkHardwareSupport(flag)"
											@update:model-value="setFlag(flag.name, $event)"
										/>
									</template>

									<v-list-item-title>
										{{ flag.label }}
										<v-chip v-if="flag.experimental" size="x-small" color="warning" class="ml-2">
											Experimental
										</v-chip>
										<v-chip
											v-if="featureFlagStore.hasOverride(flag.name)"
											size="x-small"
											color="info"
											class="ml-2"
										>
											Modified
										</v-chip>
										<v-chip
											v-if="flag.requiresSupport && !checkHardwareSupport(flag)"
											size="x-small"
											color="error"
											class="ml-2"
										>
											Not Supported
										</v-chip>
									</v-list-item-title>

									<v-list-item-subtitle>
										{{ flag.description }}
									</v-list-item-subtitle>

									<template #append>
										<v-btn
											v-if="featureFlagStore.hasOverride(flag.name)"
											icon
											size="x-small"
											variant="text"
											title="Reset to default"
											@click="resetFlag(flag.name)"
										>
											<v-icon size="small"> mdi-restore </v-icon>
										</v-btn>
									</template>
								</v-list-item>
							</v-list>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-card-text>

			<v-divider />

			<v-card-actions>
				<v-btn color="warning" variant="text" prepend-icon="mdi-restore" @click="resetAllFlags">
					Reset All to Defaults
				</v-btn>

				<v-spacer />

				<v-btn variant="text" prepend-icon="mdi-download" @click="exportConfig"> Export </v-btn>

				<v-btn variant="text" prepend-icon="mdi-upload" @click="importConfig"> Import </v-btn>

				<v-btn color="primary" variant="elevated" @click="dialog = false"> Close </v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- Reset confirmation dialog -->
	<v-dialog v-model="resetConfirmDialog" max-width="500">
		<v-card>
			<v-card-title>Reset All Feature Flags</v-card-title>
			<v-card-text>
				Are you sure you want to reset all feature flags to their default values? This action cannot
				be undone.
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" @click="resetConfirmDialog = false"> Cancel </v-btn>
				<v-btn color="warning" variant="elevated" @click="confirmResetAll"> Reset All </v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- Import dialog -->
	<v-dialog v-model="importDialog" max-width="500">
		<v-card>
			<v-card-title>Import Configuration</v-card-title>
			<v-card-text>
				<v-textarea
					v-model="importJson"
					label="Paste JSON configuration"
					rows="10"
					placeholder='{"ndvi": true, "hdrRendering": false, ...}'
				/>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn variant="text" @click="importDialog = false"> Cancel </v-btn>
				<v-btn color="primary" variant="elevated" @click="doImport"> Import </v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- Snackbar for notifications -->
	<v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="bottom">
		{{ snackbarMessage }}
		<template #actions>
			<v-btn variant="text" @click="snackbar = false"> Close </v-btn>
		</template>
	</v-snackbar>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
	useFeatureFlagStore,
	type FeatureFlagCategory,
	type FeatureFlagWithName,
	type FeatureFlagName,
} from '@/stores/featureFlagStore';
import { useGraphicsStore } from '@/stores/graphicsStore';

const featureFlagStore = useFeatureFlagStore();
const graphicsStore = useGraphicsStore();

const dialog = ref<boolean>(false);
const resetConfirmDialog = ref<boolean>(false);
const importDialog = ref<boolean>(false);
const importJson = ref<string>('');
const snackbar = ref<boolean>(false);
const snackbarMessage = ref<string>('');
const snackbarColor = ref<'error' | 'success'>('error');

const categories = computed(() => featureFlagStore.categories);

const totalFlags = computed(() => Object.keys(featureFlagStore.flags).length);

const categoryLabels: Record<FeatureFlagCategory, string> = {
	'data-layers': 'Data Layers',
	graphics: 'Graphics & Performance',
	analysis: 'Analysis Tools',
	ui: 'UI & UX',
	integration: 'Integrations',
	developer: 'Developer Tools',
};

const categoryIcons: Record<FeatureFlagCategory, string> = {
	'data-layers': 'mdi-layers',
	graphics: 'mdi-chart-line',
	analysis: 'mdi-chart-box',
	ui: 'mdi-palette',
	integration: 'mdi-puzzle',
	developer: 'mdi-code-braces',
};

function getCategoryLabel(category: FeatureFlagCategory): string {
	return categoryLabels[category] || category;
}

function getCategoryIcon(category: FeatureFlagCategory): string {
	return categoryIcons[category] || 'mdi-flag';
}

function getCategoryEnabledCount(category: FeatureFlagCategory): number {
	return featureFlagStore
		.flagsByCategory(category)
		.filter((flag) => featureFlagStore.isEnabled(flag.name)).length;
}

function getCategoryTotalCount(category: FeatureFlagCategory): number {
	return featureFlagStore.flagsByCategory(category).length;
}

function setFlag(flagName: FeatureFlagName, enabled: boolean): void {
	featureFlagStore.setFlag(flagName, enabled);
}

function resetFlag(flagName: FeatureFlagName): void {
	featureFlagStore.resetFlag(flagName);
}

function resetAllFlags(): void {
	resetConfirmDialog.value = true;
}

function confirmResetAll(): void {
	featureFlagStore.resetAllFlags();
	resetConfirmDialog.value = false;
}

function checkHardwareSupport(flag: FeatureFlagWithName): boolean {
	// Check hardware support based on graphics store
	// Use optional chaining for defensive coding
	if (flag.name === 'hdrRendering') {
		return graphicsStore?.hdrSupported ?? false;
	}
	if (flag.name === 'ambientOcclusion') {
		return graphicsStore?.ambientOcclusionSupported ?? false;
	}
	if (flag.name === 'msaaOptions') {
		return graphicsStore?.msaaSupported ?? false;
	}
	return true;
}

function exportConfig(): void {
	const config = featureFlagStore.exportConfig();
	const json = JSON.stringify(config, null, 2);

	// Create a blob and download
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'feature-flags-config.json';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function importConfig(): void {
	importJson.value = '';
	importDialog.value = true;
}

function doImport(): void {
	try {
		const config = JSON.parse(importJson.value);
		featureFlagStore.importConfig(config);
		importDialog.value = false;
		importJson.value = '';
		showSnackbar('Configuration imported successfully', 'success');
	} catch (error) {
		showSnackbar('Invalid JSON format. Please check your input and try again.', 'error');
		console.error('Import error:', error);
	}
}

function showSnackbar(message: string, color: 'error' | 'success' = 'error'): void {
	snackbarMessage.value = message;
	snackbarColor.value = color;
	snackbar.value = true;
}
</script>

<style scoped>
.v-expansion-panel-text {
	padding: 0;
}
</style>
