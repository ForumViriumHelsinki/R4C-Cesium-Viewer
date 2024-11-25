<template>
  <v-dialog
    v-model="isVisible"
    persistent
    width="auto"
  >
    <v-card>
      <v-card-title class="text-h5">
      Welcome to the R4C demonstration tool!
      </v-card-title>
      <v-card-text>
      The purpose of the demo tool is to visualize potential heat risk and socioeconomic vulnerability.
      The demo tool helps to visualize the risks associated with climate change adaptation and the role of green infrastructure.
      The formulas and calculations haven't undergone scientific peer review.
      The visualizations offer a general indication of risks.
      All data for development use only - Do not apply in planning.
      </v-card-text>
      <v-card-actions>
        <v-spacer/>
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
