/**
 * useChartSize: width is measured from the container, height derives from the
 * aspect ratio, resize notifications collapse to one redraw per frame, and
 * cleanup disconnects the observer and removes chart tooltips.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useChartSize } from '@/composables/useChartSize.js'

let observers
class FakeResizeObserver {
	constructor(callback) {
		this.callback = callback
		this.disconnect = vi.fn()
		this.observe = vi.fn()
		observers.push(this)
	}
	notify(width) {
		this.callback([{ contentRect: { width } }])
	}
}

const makeContainer = (clientWidth) => {
	const el = document.createElement('div')
	Object.defineProperty(el, 'clientWidth', { value: clientWidth })
	return el
}

describe('useChartSize', { tags: ['@unit'] }, () => {
	let frames

	beforeEach(() => {
		observers = []
		frames = []
		vi.stubGlobal('ResizeObserver', FakeResizeObserver)
		vi.stubGlobal('requestAnimationFrame', (cb) => frames.push(cb))
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	const flushFrames = () => {
		const pending = frames
		frames = []
		pending.forEach((cb) => cb())
	}

	it('reads the width synchronously when the container ref is set', () => {
		const containerRef = ref(null)
		const { width, height } = useChartSize(containerRef, { aspect: 2 })

		expect(width.value).toBe(0)
		containerRef.value = makeContainer(401.7)

		expect(width.value).toBe(401)
		expect(height.value).toBe(201)
		expect(observers[0].observe).toHaveBeenCalledWith(containerRef.value)
	})

	it('coalesces resize notifications into one redraw per frame', () => {
		const onResize = vi.fn()
		const containerRef = ref(makeContainer(300))
		const { width } = useChartSize(containerRef, { aspect: 1.5, onResize })

		observers[0].notify(320)
		observers[0].notify(340)
		expect(onResize).not.toHaveBeenCalled()

		flushFrames()
		expect(onResize).toHaveBeenCalledTimes(1)
		expect(width.value).toBe(340)
	})

	it('does not redraw when the width is unchanged or zero', () => {
		const onResize = vi.fn()
		const containerRef = ref(makeContainer(300))
		useChartSize(containerRef, { aspect: 1.5, onResize })

		observers[0].notify(300)
		observers[0].notify(0)
		flushFrames()

		expect(onResize).not.toHaveBeenCalled()
	})

	it('cleanup disconnects the observer and removes tooltips', async () => {
		const container = makeContainer(300)
		const tooltip = document.createElement('div')
		tooltip.className = 'tooltip'
		container.appendChild(tooltip)
		const containerRef = ref(container)
		const { cleanup } = useChartSize(containerRef, { aspect: 1.5 })

		cleanup()
		await nextTick()

		expect(observers[0].disconnect).toHaveBeenCalled()
		expect(container.querySelector('.tooltip')).toBeNull()
		// The ref watcher is stopped: a new element is not observed.
		containerRef.value = makeContainer(200)
		expect(observers).toHaveLength(1)
	})
})
