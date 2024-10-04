<template>
  <v-dialog
    v-model="isVisible"
    persistent
    width="auto"
  >
    <v-card>
      <v-card-title class="text-h5">
        Disclaimer
      </v-card-title>
      <v-card-text>
        All data for development use only - Do not apply in planning.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          @click="closePopup"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
	data() {
		return {
			isVisible: true
		};
	},
	methods: {
		closePopup() {
			this.isVisible = false;
		},
	},
};
</script>