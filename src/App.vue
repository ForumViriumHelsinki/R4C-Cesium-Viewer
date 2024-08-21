<template>
  <div id="app">
    <!-- Render Authentication Component if the user is not authenticated -->
    <Authentication v-if="!isAuthenticated" @authenticated="onAuthenticated" />

    <!-- Render the rest of the app if the user is authenticated -->
    <div v-else id="canvasScalerDiv">
      <CesiumViewer />
      <GridView />
      <Geocoding />
      <PrintBox />
      <PostalCodeView />

      <!-- Add Logo -->
      <div class="logoHolder">
        <img src="/public/assets/images/regions4climate-black.png" id="logoR4C" alt="Regions4Climate" />
        <img src="/public/assets/images/fvh-1_musta.png" id="logoFVH" alt="Forum Virium Helsinki" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import CesiumViewer from './components/CesiumViewer.vue';
import Geocoding from './components/Geocoding.vue';
import PrintBox from './components/PrintBox.vue';
import GridView from './components/GridView.vue';
import PostalCodeView from './components/PostalCodeView.vue';
import Authentication from './components/Authentication.vue';

// Authentication state
const isAuthenticated = ref(false);

function onAuthenticated() {
  isAuthenticated.value = true;
}

onMounted(() => {
  // Check if the user is already authenticated (using localStorage)
  const authStatus = localStorage.getItem('isAuthenticated');
  if (authStatus === 'true') {
    isAuthenticated.value = true;
  }
});
</script>

<style>
@charset "UTF-8";

.header {
  font-family: sans-serif;
  font-weight: bold;
  font-size: small;
  margin: 3px;
}

.logoHolder {
  position: fixed;
  bottom: 10px;
  right: 5px;
}

#logoFVH {
  z-index: 1000;
  height: 40px;
  float: right;
  margin-right: 10px;
}

#logoR4C {
  z-index: 1000;
  height: 30px;
  float: right;
}

body, html {
  margin: 0px;
  height: 100%;
}

#canvasScalerDiv {
  width: 100%;
  height: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>