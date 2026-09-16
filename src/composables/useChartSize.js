import { computed, ref, watch } from 'vue'

/**
 * Measures a chart container's width with a ResizeObserver and derives the
 * chart height from a fixed aspect ratio.
 *
 * Only width is observed. A D3 redraw changes the container's height, so an
 * observer watching height would re-trigger itself on every redraw
 * ("ResizeObserver loop completed with undelivered notifications").
 * Notifications are coalesced to one `onResize` call per animation frame,
 * because every chart here does a full clear-and-redraw.
 *
 * The caller owns teardown: call `cleanup` from `onBeforeUnmount`. It
 * disconnects the observer, cancels a pending redraw, and removes any tooltip
 * divs `Plot.createTooltip` appended to the container.
 *
 * @param {import('vue').Ref<HTMLElement | null>} containerRef - Chart container element
 * @param {Object} options
 * @param {number} options.aspect - Width divided by height, e.g. `1.6`
 * @param {() => void} [options.onResize] - Redraw callback, called after the width changes
 * @returns {{
 *   width: import('vue').ComputedRef<number>,
 *   height: import('vue').ComputedRef<number>,
 *   cleanup: () => void
 * }} `width` is the container's content width in whole pixels (0 until measured);
 *   `height` is `width / aspect`, rounded.
 */
export function useChartSize(containerRef, { aspect, onResize }) {
	const measuredWidth = ref(0)
	let observer = null
	let frame = 0

	const scheduleResize = () => {
		if (!onResize || frame) return
		frame = requestAnimationFrame(() => {
			frame = 0
			onResize()
		})
	}

	const setWidth = (value) => {
		const next = Math.floor(value)
		if (next === measuredWidth.value) return
		measuredWidth.value = next
		if (next > 0) scheduleResize()
	}

	const disconnect = () => {
		observer?.disconnect()
		observer = null
	}

	const stopWatch = watch(
		containerRef,
		(el) => {
			disconnect()
			if (!el) return
			// Read synchronously so a chart drawn in onMounted has a width before
			// the observer's first (asynchronous) notification. The watcher is
			// `sync` because template refs are assigned before mounted hooks run;
			// a `post` watcher would fire after them.
			measuredWidth.value = Math.floor(el.clientWidth)
			if (typeof ResizeObserver === 'undefined') return
			observer = new ResizeObserver((entries) => {
				const entry = entries[entries.length - 1]
				if (entry) setWidth(entry.contentRect.width)
			})
			observer.observe(el)
		},
		{ immediate: true, flush: 'sync' }
	)

	const width = computed(() => measuredWidth.value)
	const height = computed(() => Math.round(measuredWidth.value / aspect))

	const cleanup = () => {
		stopWatch()
		disconnect()
		if (frame) {
			cancelAnimationFrame(frame)
			frame = 0
		}
		containerRef.value?.querySelectorAll(':scope > .tooltip').forEach((el) => el.remove())
	}

	return { width, height, cleanup }
}
