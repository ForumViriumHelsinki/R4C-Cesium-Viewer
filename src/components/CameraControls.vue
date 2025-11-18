<template>
  <div class="camera-controls-container">
    <div class="compass-assembly">
      <div class="compass-needle-container">
        <v-icon
          :style="compassNeedleStyle"
          size="x-large"
        >
          mdi-navigation-variant
        </v-icon>
      </div>

      <v-btn
        class="dir-btn north"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(0)"
      >
        N
      </v-btn>
      <v-btn
        class="dir-btn northeast"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(45)"
      >
        NE
      </v-btn>
      <v-btn
        class="dir-btn east"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(90)"
      >
        E
      </v-btn>
      <v-btn
        class="dir-btn southeast"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(135)"
      >
        SE
      </v-btn>
      <v-btn
        class="dir-btn south"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(180)"
      >
        S
      </v-btn>
      <v-btn
        class="dir-btn southwest"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(225)"
      >
        SW
      </v-btn>
      <v-btn
        class="dir-btn west"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(270)"
      >
        W
      </v-btn>
      <v-btn
        class="dir-btn northwest"
        size="x-small"
        :disabled="!viewerReady"
        @click.stop="setHeading(315)"
      >
        NW
      </v-btn>
    </div>

    <div class="zoom-controls">
      <v-btn
        icon
        size="small"
        :disabled="!viewerReady"
        @click.stop="zoomIn"
      >
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-btn
        icon
        size="small"
        :disabled="!viewerReady"
        @click.stop="zoomOut"
      >
        <v-icon>mdi-minus</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue';
import { useGlobalStore } from '../stores/globalStore';
import Camera from '../services/camera';
import * as Cesium from 'cesium';

const store = useGlobalStore();
let cameraService = null;
const currentHeading = ref(0);
const viewerReady = ref(false);

watch(() => store.cesiumViewer, (newViewer) => {
  if (newViewer && !cameraService) {
    cameraService = new Camera();

    newViewer.camera.changed.addEventListener(updateHeading);
    newViewer.camera.moveEnd.addEventListener(updateHeading);
    updateHeading();

    viewerReady.value = true;
  }
}, { immediate: true });

const updateHeading = () => {
  if (store.cesiumViewer) {
    const headingDegrees = Cesium.Math.toDegrees(store.cesiumViewer.camera.heading);
    currentHeading.value = headingDegrees;
  }
};

onUnmounted(() => {
  if (store.cesiumViewer) {
    store.cesiumViewer.camera.changed.removeEventListener(updateHeading);
    store.cesiumViewer.camera.moveEnd.removeEventListener(updateHeading);
  }
});

const compassNeedleStyle = computed(() => ({
  transform: `rotate(${currentHeading.value - 45}deg)`,
  transition: 'transform 0.2s ease-out',
}));

const setHeading = (degrees) => {
  cameraService?.setHeading(degrees);
};

const zoomIn = () => {
  cameraService?.zoom(1.5);
};

const zoomOut = () => {
  cameraService?.zoom(0.5);
};
</script>

<style scoped>
.camera-controls-container {
  position: absolute;
  top: 75px;
  left: 20px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.compass-assembly {
  position: relative;
  width: 100px;
  height: 100px;
}

.compass-needle-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  border: 1px solid #ccc;
  pointer-events: none;
}

.compass-needle-container .v-icon {
  color: #c62828;
  will-change: transform; /* Performance hint for smooth rotation animation */
}

.dir-btn {
  position: absolute;
  min-width: 32px !important;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #aaa;
  font-size: 10px;
  font-weight: bold;
  padding: 0;
  color: #333;
  touch-action: manipulation; /* Prevent double-tap zoom delay */
}

.dir-btn.north     { top: 0;      left: 50%;    transform: translateX(-50%); }
.dir-btn.northeast { top: 8px;    right: 8px;   }
.dir-btn.east      { top: 50%;    right: 0;     transform: translateY(-50%); }
.dir-btn.southeast { bottom: 8px; right: 8px;   }
.dir-btn.south     { bottom: 0;   left: 50%;    transform: translateX(-50%); }
.dir-btn.southwest { bottom: 8px; left: 8px;    }
.dir-btn.west      { top: 50%;    left: 0;      transform: translateY(-50%); }
.dir-btn.northwest { top: 8px;    left: 8px;    }

.zoom-controls {
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #ccc;
  background-color: rgba(255, 255, 255, 0.9);
}

.zoom-controls .v-btn {
  border-radius: 0;
  border-bottom: 1px solid #ccc;
  touch-action: manipulation; /* Prevent double-tap zoom delay */
}

.zoom-controls .v-btn:last-child {
  border-bottom: none;
}

/* Mobile and tablet responsiveness */
@media (max-width: 768px) {
  .camera-controls-container {
    top: auto;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: row;
    gap: 12px;
  }

  .compass-assembly {
    width: 90px;
    height: 90px;
  }

  .compass-needle-container {
    width: 54px;
    height: 54px;
  }

  /* Increase touch target size for mobile - WCAG 2.5.5 compliance */
  .dir-btn {
    min-width: 36px !important;
    width: 36px;
    height: 36px;
    font-size: 11px;
  }

  .dir-btn.northeast { top: 6px;    right: 6px;   }
  .dir-btn.southeast { bottom: 6px; right: 6px;   }
  .dir-btn.southwest { bottom: 6px; left: 6px;    }
  .dir-btn.northwest { top: 6px;    left: 6px;    }
}

/* Very small mobile - hide compass controls, keep zoom only */
@media (max-width: 480px) {
  .camera-controls-container {
    bottom: 70px;
    left: 20px;
    transform: none;
  }

  .compass-assembly {
    display: none;
  }

  .zoom-controls {
    flex-direction: row;
  }

  .zoom-controls .v-btn {
    border-bottom: none;
    border-right: 1px solid #ccc;
  }

  .zoom-controls .v-btn:last-child {
    border-right: none;
  }
}
</style>
