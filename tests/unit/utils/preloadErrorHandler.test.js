/**
 * Unit tests for the global vite:preloadError handler.
 *
 * Covers the stale-chunk recovery path for issue #740: when a code-split
 * chunk fails to preload after a deploy, the handler should reload the
 * page so the fresh index.html with current chunk hashes can be loaded.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPreloadErrorHandler } from '@/utils/preloadErrorHandler.js'

/**
 * Build a minimal fake window for handler isolation. Each test gets its
 * own instance so install-flags and listeners don't leak across cases.
 */
function makeFakeWindow() {
	const listeners = new Map()
	const storage = new Map()
	const reload = vi.fn()
	const win = {
		addEventListener: vi.fn((type, handler) => {
			if (!listeners.has(type)) listeners.set(type, new Set())
			listeners.get(type).add(handler)
		}),
		removeEventListener: vi.fn((type, handler) => {
			listeners.get(type)?.delete(handler)
		}),
		dispatchEvent: (type, event) => {
			for (const handler of listeners.get(type) ?? []) {
				handler(event)
			}
		},
		location: { reload },
		sessionStorage: {
			getItem: (k) => (storage.has(k) ? storage.get(k) : null),
			setItem: (k, v) => storage.set(k, String(v)),
			removeItem: (k) => storage.delete(k),
		},
	}
	return { win, reload, storage }
}

describe('preloadErrorHandler', () => {
	let consoleWarnSpy
	let consoleErrorSpy

	beforeEach(() => {
		// logger.warn / logger.error wrap console — silence them so the test
		// output stays clean. Vitest still surfaces real assertion failures.
		consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleWarnSpy.mockRestore()
		consoleErrorSpy.mockRestore()
	})

	it('registers a vite:preloadError listener on the provided window', () => {
		const { win } = makeFakeWindow()

		installPreloadErrorHandler({ win })

		expect(win.addEventListener).toHaveBeenCalledWith('vite:preloadError', expect.any(Function))
	})

	it('reloads the page when a vite:preloadError event fires', () => {
		const { win, reload } = makeFakeWindow()
		installPreloadErrorHandler({ win, now: () => 1000 })

		win.dispatchEvent('vite:preloadError', {
			payload: new Error('Failed to fetch dynamically imported module: /assets/ControlPanel.X.js'),
		})

		expect(reload).toHaveBeenCalledTimes(1)
	})

	it('records the reload timestamp in sessionStorage so a second failure can short-circuit', () => {
		const { win, storage } = makeFakeWindow()
		installPreloadErrorHandler({ win, now: () => 5000 })

		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404') })

		expect(storage.get('r4c:preloadErrorReloadAt')).toBe('5000')
	})

	it('does not reload again if a second preloadError fires inside the guard window', () => {
		const { win, reload } = makeFakeWindow()
		let currentTime = 1000
		installPreloadErrorHandler({ win, now: () => currentTime })

		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404') })
		expect(reload).toHaveBeenCalledTimes(1)

		// 5 seconds later — still inside the 10s guard window.
		currentTime = 6000
		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404 again') })

		expect(reload).toHaveBeenCalledTimes(1)
		// And the second failure should be logged loudly via logger.error.
		expect(consoleErrorSpy).toHaveBeenCalled()
	})

	it('reloads again once the guard window has elapsed', () => {
		const { win, reload } = makeFakeWindow()
		let currentTime = 1000
		installPreloadErrorHandler({ win, now: () => currentTime })

		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404') })
		expect(reload).toHaveBeenCalledTimes(1)

		// 15 seconds later — outside the 10s guard window.
		currentTime = 16_000
		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404 later') })

		expect(reload).toHaveBeenCalledTimes(2)
	})

	it('is idempotent — calling install twice attaches only one listener', () => {
		const { win } = makeFakeWindow()

		installPreloadErrorHandler({ win })
		installPreloadErrorHandler({ win })

		expect(win.addEventListener).toHaveBeenCalledTimes(1)
	})

	it('returns a cleanup function that removes the listener', () => {
		const { win, reload } = makeFakeWindow()

		const cleanup = installPreloadErrorHandler({ win })
		cleanup()

		expect(win.removeEventListener).toHaveBeenCalledWith('vite:preloadError', expect.any(Function))

		// After cleanup, dispatching the event should not trigger a reload.
		win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404') })
		expect(reload).not.toHaveBeenCalled()
	})

	it('tolerates sessionStorage throwing (private browsing mode)', () => {
		const { win, reload } = makeFakeWindow()
		win.sessionStorage = {
			getItem: () => {
				throw new Error('private mode')
			},
			setItem: () => {
				throw new Error('private mode')
			},
		}

		installPreloadErrorHandler({ win, now: () => 1000 })

		// Should still reload despite storage failure.
		expect(() => {
			win.dispatchEvent('vite:preloadError', { payload: new Error('chunk 404') })
		}).not.toThrow()
		expect(reload).toHaveBeenCalledTimes(1)
	})

	it('handles events with no payload gracefully', () => {
		const { win, reload } = makeFakeWindow()
		installPreloadErrorHandler({ win, now: () => 1000 })

		expect(() => {
			win.dispatchEvent('vite:preloadError', {})
		}).not.toThrow()
		expect(reload).toHaveBeenCalledTimes(1)
	})

	it('returns a no-op cleanup when no window is available (SSR / non-browser)', () => {
		const cleanup = installPreloadErrorHandler({ win: null })
		expect(cleanup).toBeInstanceOf(Function)
		expect(() => cleanup()).not.toThrow()
	})
})
