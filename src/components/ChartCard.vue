<template>
	<!-- Unnamed <section>: no extra landmark (panels name their own region), and
	     it keeps <header>/<footer> from mapping to page banner/contentinfo. -->
	<section class="chart-card">
		<header class="chart-card__header">
			<v-icon
				size="small"
				class="mr-2"
			>
				{{ icon }}
			</v-icon>
			<span class="text-subtitle-2">{{ title }}</span>
			<v-spacer />
			<v-btn
				icon
				variant="text"
				size="x-small"
				:aria-label="`Close ${title}`"
				@click="emit('close')"
			>
				<v-icon size="small">mdi-close</v-icon>
			</v-btn>
		</header>
		<div
			v-if="$slots.controls"
			class="chart-card__controls"
		>
			<slot name="controls" />
		</div>
		<slot />
		<footer
			v-if="$slots.source"
			class="chart-card__source text-caption"
		>
			<slot name="source" />
		</footer>
	</section>
</template>

<script setup>
/**
 * Fixed anatomy for an analysis card: header (icon, title, close), optional
 * controls row, chart body (default slot), optional source note.
 * See docs/adr/ADR-009-analysis-registry.md.
 */
defineProps({
	title: { type: String, required: true },
	icon: { type: String, required: true },
})

const emit = defineEmits(['close'])
</script>

<style scoped>
.chart-card__header {
	display: flex;
	align-items: center;
	margin-bottom: 8px;
}

.chart-card__controls {
	margin-bottom: 8px;
}

.chart-card__source {
	margin-top: 8px;
	color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
