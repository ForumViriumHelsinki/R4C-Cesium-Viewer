<template>
    <div class="disclaimer-popup" v-if="isVisible">
      <div class="popup-content">
        <h2>Disclaimer</h2>
        <p>All data for development use only - Do not apply in planning.</p>
        <button @click="closePopup">Close</button>
      </div>
    </div>
  </template>

<script>
export default {
	name: 'DisclaimerPopup',
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
.disclaimer-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6);
}
.popup-content {
  background: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  text-align: center;
}
</style>