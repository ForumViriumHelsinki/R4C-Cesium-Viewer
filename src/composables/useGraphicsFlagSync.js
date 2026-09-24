/**
 * @module composables/useGraphicsFlagSync
 * Drives graphicsStore from the graphics feature flags (#983).
 *
 * | Flag                | graphicsStore action           |
 * | ------------------- | ------------------------------ |
 * | `requestRenderMode` | `setRequestRenderMode`         |
 * | `hdrRendering`      | `setHdrEnabled`                |
 * | `ambientOcclusion`  | `setAmbientOcclusionEnabled`   |
 *
 * Each binding re-runs whenever the flag's value changes: GOFF evaluation after
 * `refreshFlags()`, or a local override from FeatureFlagsPanel. The graphics
 * service's store watchers then carry the value to the live scene.
 */

import { watch } from 'vue'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGraphicsStore } from '../stores/graphicsStore.js'

/**
 * Start mapping the graphics feature flags onto graphicsStore.
 *
 * Called from a component's setup, the watchers stop with the component.
 * Elsewhere, call the returned function to stop them.
 *
 * @returns {() => void} Stops all flag watchers
 */
export function useGraphicsFlagSync() {
	const featureFlagStore = useFeatureFlagStore()
	const graphicsStore = useGraphicsStore()

	const stops = [
		watch(
			() => featureFlagStore.isEnabled('requestRenderMode'),
			(enabled) => graphicsStore.setRequestRenderMode(enabled),
			{ immediate: true }
		),
		// The HDR and AO actions store `enabled && supported`. Support is detected
		// on an idle callback after the viewer exists, which is usually after the
		// flags have loaded, so re-apply the flag when support changes.
		watch(
			[() => featureFlagStore.isEnabled('hdrRendering'), () => graphicsStore.hdrSupported],
			([enabled]) => graphicsStore.setHdrEnabled(enabled),
			{ immediate: true }
		),
		watch(
			[
				() => featureFlagStore.isEnabled('ambientOcclusion'),
				() => graphicsStore.ambientOcclusionSupported,
			],
			([enabled]) => graphicsStore.setAmbientOcclusionEnabled(enabled),
			{ immediate: true }
		),
	]

	return () => {
		for (const stop of stops) stop()
	}
}
