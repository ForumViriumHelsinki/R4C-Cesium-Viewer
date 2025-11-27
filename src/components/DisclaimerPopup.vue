<template>
	<v-dialog
		v-model="isVisible"
		persistent
		max-width="480"
		role="dialog"
		aria-labelledby="disclaimer-title"
		aria-describedby="disclaimer-content"
	>
		<v-card class="compact-disclaimer-card">
			<v-card-title class="compact-title">
				<v-icon
					class="mr-2"
					color="primary"
				>
					mdi-information
				</v-icon>
				<h1
					id="disclaimer-title"
					class="title-text"
				>
					R4C Climate Demo
				</h1>
			</v-card-title>

			<v-card-text
				id="disclaimer-content"
				class="compact-content"
			>
				<p class="description">
					Climate adaptation visualization tool for heat risk and green infrastructure planning.
				</p>

				<div class="disclaimer-box">
					<v-icon
						size="16"
						color="warning"
						class="mr-1"
					>
						mdi-alert
					</v-icon>
					<span class="disclaimer-note">
						<strong>Demo only:</strong> Data is for development use - not for planning decisions.
					</span>
				</div>
			</v-card-text>

			<v-card-actions class="compact-actions">
				<v-spacer />
				<v-btn
					color="primary"
					variant="elevated"
					size="small"
					aria-label="Close disclaimer dialog and continue to application"
					autofocus
					@click="closePopup"
				>
					<v-icon
						class="mr-1"
						size="16"
					>
						mdi-map
					</v-icon>
					Explore Map
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	data() {
		return {
			isVisible: true,
		};
	},
	methods: {
		closePopup() {
			this.isVisible = false;
		},
	},
};
</script>

<style scoped>
.compact-disclaimer-card {
	border-radius: 12px;
	overflow: hidden;
}

.compact-title {
	background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
	color: white;
	padding: 16px 20px 12px 20px;
	display: flex;
	align-items: center;
	min-height: auto;
}

.title-text {
	font-size: 1.1rem;
	font-weight: 600;
	margin: 0;
	line-height: 1.2;
}

.compact-content {
	padding: 20px;
	background-color: #fafafa;
}

.description {
	font-size: 0.9rem;
	color: rgba(0, 0, 0, 0.8);
	margin-bottom: 16px;
	line-height: 1.4;
}

.disclaimer-box {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 12px;
	background-color: rgba(255, 152, 0, 0.1);
	border: 1px solid rgba(255, 152, 0, 0.3);
	border-radius: 8px;
	margin-bottom: 8px;
}

.disclaimer-note {
	font-size: 0.85rem;
	color: rgba(0, 0, 0, 0.85);
	line-height: 1.3;
}

.compact-actions {
	padding: 12px 20px 20px 20px;
	background-color: #fafafa;
}

/* Mobile responsive */
@media (max-width: 600px) {
	.compact-disclaimer-card {
		margin: 16px;
	}

	.compact-title {
		padding: 12px 16px 8px 16px;
	}

	.title-text {
		font-size: 1rem;
	}

	.compact-content {
		padding: 16px;
	}

	.description {
		font-size: 0.85rem;
	}

	.disclaimer-note {
		font-size: 0.8rem;
	}

	.compact-actions {
		padding: 8px 16px 16px 16px;
	}
}
</style>
