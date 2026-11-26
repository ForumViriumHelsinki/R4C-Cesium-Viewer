<template>
	<section
		class="adaptation-tool"
		:aria-labelledby="headingId"
	>
		<h3
			:id="headingId"
			class="adaptation-tool__title text-subtitle-1 font-weight-medium"
		>
			{{ title }}
		</h3>
		<p
			v-if="description"
			class="adaptation-tool__description text-body-2 text-medium-emphasis"
		>
			{{ description }}
		</p>
		<slot />
	</section>
</template>

<script setup>
/**
 * Shared layout for the Climate Adaptation tools (Centers, Optimizer, Parks):
 * a heading, one sentence on what the tool does, then the controls. Flat, so
 * the tools sit directly in the expansion panel instead of a nested card.
 */
import { useId } from 'vue'

defineProps({
	title: { type: String, required: true },
	description: { type: String, default: '' },
})

const headingId = `adaptation-tool-${useId()}`
</script>

<style scoped>
.adaptation-tool {
	padding: 12px 4px 4px;
}

.adaptation-tool__title {
	margin-bottom: 4px;
}

.adaptation-tool__description {
	margin-bottom: 16px;
}
</style>
