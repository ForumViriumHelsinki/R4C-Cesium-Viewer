<template>
	<!--
		Runtime error snackbar: the one channel for user-triggered failures (#1152, #1153).
		Raised by globalStore.showError(message, context, { severity, retry }).
		Severity sets colour and icon: error (mdi-alert-circle) when an action failed,
		warning (mdi-alert-circle-outline) when the app keeps working with less data.
	-->
	<v-snackbar
		:model-value="notification.show"
		:timeout="notification.retry ? RETRY_TIMEOUT_MS : TIMEOUT_MS"
		:color="notification.severity"
		location="bottom"
		:role="isWarning ? 'status' : 'alert'"
		:aria-live="isWarning ? 'polite' : 'assertive'"
		@update:model-value="onVisibilityChange"
	>
		<div class="d-flex align-center">
			<v-icon
				class="mr-2"
				:icon="isWarning ? 'mdi-alert-circle-outline' : 'mdi-alert-circle'"
				aria-hidden="true"
			/>
			<div>
				{{ notification.message }}
			</div>
		</div>
		<template #actions>
			<v-btn
				v-if="notification.retry"
				variant="text"
				@click="store.retryError()"
			>
				Retry
			</v-btn>
			<v-btn
				variant="text"
				@click="store.hideError()"
			>
				Close
			</v-btn>
		</template>
	</v-snackbar>
</template>

<script setup>
import { computed } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'

/** Auto-dismiss delay for a message with nothing to act on. */
const TIMEOUT_MS = 6000
/** A message with a Retry stays longer, so there is time to use it. */
const RETRY_TIMEOUT_MS = 10000

const store = useGlobalStore()
const notification = computed(() => store.errorNotification)
const isWarning = computed(() => notification.value.severity === 'warning')

/** Timeout or swipe-away: clear the message and its retry, as Close does. */
const onVisibilityChange = (visible) => {
	if (!visible) store.hideError()
}
</script>
