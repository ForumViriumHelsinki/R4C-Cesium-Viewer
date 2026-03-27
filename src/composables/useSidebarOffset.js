import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useToggleStore } from '../stores/toggleStore'

const SIDEBAR_EXPANDED_WIDTH = 360
const SIDEBAR_RAIL_WIDTH = 56

/**
 * Returns a reactive left offset (in px) that accounts for the sidebar width.
 * Use in floating controls that sit on the left edge of the map.
 *
 * @param {number} [margin=20] - Extra gap between sidebar edge and the element
 * @returns {{ sidebarOffset: import('vue').ComputedRef<number>, offsetStyle: import('vue').ComputedRef<{ left: string }> }}
 */
export function useSidebarOffset(margin = 20) {
	const toggleStore = useToggleStore()
	const { smAndDown: isMobile } = useDisplay()

	const sidebarOffset = computed(() => {
		if (isMobile.value) return margin

		if (toggleStore.sidebarMode === 'expanded') return SIDEBAR_EXPANDED_WIDTH + margin
		if (toggleStore.sidebarMode === 'rail') return SIDEBAR_RAIL_WIDTH + margin
		return margin
	})

	const offsetStyle = computed(() => ({
		left: `${sidebarOffset.value}px`,
	}))

	return { sidebarOffset, offsetStyle }
}
