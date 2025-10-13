<template>
  <v-dialog
v-model="dialog"
max-width="600"
persistent
>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="outlined"
        color="primary"
        prepend-icon="mdi-palette"
        block
        class="graphics-settings-button"
      >
        Graphics Settings
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">
mdi-palette
</v-icon>
        Graphics Settings
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialog = false"
        />
      </v-card-title>

      <v-card-subtitle>
        Anti-aliasing and rendering settings for better 3D building visualization
      </v-card-subtitle>

      <v-card-text>
        <GraphicsQuality />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="dialog = false"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref } from 'vue'
import GraphicsQuality from './GraphicsQuality.vue'

export default {
  name: 'GraphicsSettingsDialog',
  components: {
    GraphicsQuality
  },
  setup() {
    const dialog = ref(false)

    return {
      dialog
    }
  }
}
</script>

<style scoped>
.graphics-settings-button {
  margin-bottom: 16px;
}
</style>
