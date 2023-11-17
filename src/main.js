import { createApp } from 'vue';
import App from './App.vue';
import './style.css'

const app = createApp(App);

app.config.globalProperties.$showPlot = true;
app.config.globalProperties.$showVegetation = false;
app.config.globalProperties.$showOtherNature = false;
app.config.globalProperties.$print = true;
app.config.globalProperties.$postalcode = null;
app.config.globalProperties.$nameOfZone = null;
app.config.globalProperties.$averageHeatExposure = 0;
app.config.globalProperties.$averageTreeArea = 0;

app.mount('#app');
