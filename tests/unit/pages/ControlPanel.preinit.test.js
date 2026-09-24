/**
 * "Click everything before init" sweep for the sidebar (#951, Sentry REGIONS4CLIMATE-3Y).
 *
 * ControlPanel mounts in the same tick as CesiumViewer, but the lazy Cesium module
 * (~1 MB gz) and the viewer arrive later. Any sidebar handler that runs in that window
 * either throws from getCesium() or dereferences a null globalStore.cesiumViewer.
 *
 * The sweep mounts ControlPanel with the REAL, uninitialised cesiumProvider and a null
 * viewer, then clicks every button, list item, tab, switch and select it can find,
 * round after round (tabs, menus and panels reveal more), and runs a search. It names no
 * handler, so a handler added later is covered without editing this file.
 *
 * jsdom does not implement `inert`, so the sweep models the browser rule itself: user
 * input is never delivered to an element inside an inert subtree (HTML "inert" subtrees).
 * Elements under `[inert]` are skipped, exactly as a real click would be.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ControlPanel from '@/pages/ControlPanel.vue'
import { cesiumProvider } from '@/services/cesiumProvider.js'
import { useGlobalStore } from '@/stores/globalStore.js'

// tests/setup.js mocks the provider as already initialised; this sweep needs the real one.
vi.mock('@/services/cesiumProvider', async () => vi.importActual('@/services/cesiumProvider.js'))

// jsdom has no `inert` IDL property, so Vue falls back to setAttribute and renders
// `inert="false"` (Vuetify's drawer does this). Browsers reflect it as a boolean
// attribute; model that so `[inert]` means what it means in a browser.
if (!('inert' in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, 'inert', {
		configurable: true,
		get() {
			return this.hasAttribute('inert')
		},
		set(value) {
			this.toggleAttribute('inert', Boolean(value))
		},
	})
}

const INTERACTIVE =
	'button, .v-list-item, [role="tab"], [role="option"], input[type="checkbox"], input[type="radio"], .v-field'

/** One digitransit feature so the search produces a clickable address result. */
const GEOCODING_BODY = {
	features: [
		{
			properties: { name: 'Mannerheimintie 1', postalcode: '00100', locality: 'Helsinki' },
			geometry: { coordinates: [24.94, 60.17] },
		},
	],
}

/**
 * Answers the geocoding request; every other request stays pending, so no loader
 * fails for reasons unrelated to viewer readiness.
 * @param {string} url
 */
const fakeFetch = (url) => {
	if (String(url).includes('/digitransit/geocoding')) {
		return Promise.resolve({
			ok: true,
			status: 200,
			statusText: 'OK',
			headers: new Headers({ 'content-type': 'application/json' }),
			json: async () => GEOCODING_BODY,
		})
	}
	return new Promise(() => {})
}

/** Lets pending microtasks settle and Node emit any unhandledRejection. */
const settle = async () => {
	await flushPromises()
	await new Promise((resolve) => setTimeout(resolve, 0))
	await flushPromises()
}

/** Browsers deliver no user input to an inert subtree (jsdom does not model this). */
const reachable = (el) => el.isConnected && !el.closest('[inert]') && !el.disabled

/** Human-readable name for the control an error is attributed to. */
const describeControl = (el) =>
	el.getAttribute('aria-label') ||
	el.closest('.v-input')?.querySelector('label')?.textContent?.trim() ||
	el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ||
	`<${el.tagName.toLowerCase()} class="${el.className}">`

/** Name of the control being exercised, so errors say which one raised them. */
let currentControl = '(mount)'

/**
 * Clicks every reachable interactive element, repeating while new ones appear.
 * @returns {Promise<number>} number of elements clicked
 */
const clickEverything = async () => {
	const visited = new Set()
	let clicked = 0
	for (let round = 0; round < 6; round++) {
		const fresh = [...document.body.querySelectorAll(INTERACTIVE)].filter((el) => !visited.has(el))
		if (fresh.length === 0) break
		for (const el of fresh) {
			visited.add(el)
			if (!reachable(el)) continue
			currentControl = describeControl(el)
			el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
			el.click()
			clicked++
			await settle()
		}
	}
	return clicked
}

/** Types a query into every reachable text field and presses Enter. */
const searchEverywhere = async () => {
	for (const input of document.body.querySelectorAll('input[type="text"], input:not([type])')) {
		if (!reachable(input)) continue
		currentControl = `search in ${describeControl(input)}`
		input.value = 'Mannerheimintie'
		input.dispatchEvent(new Event('input', { bubbles: true }))
		input.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', bubbles: true }))
		await settle()
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
		await settle()
	}
}

describe('ControlPanel before the Cesium viewer exists', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null
	let vueErrors
	let rejections
	let onRejection
	/** console.error lines that are a caught-and-logged version of the same failure */
	let swallowed

	const mountPanel = () => {
		const vuetify = createVuetify({ components, directives })
		wrapper = mount(
			{ render: () => h(components.VApp, null, { default: () => h(ControlPanel) }) },
			{
				attachTo: document.body,
				global: {
					plugins: [vuetify],
					config: { errorHandler: (err) => vueErrors.push(`${currentControl}: ${err}`) },
				},
			}
		)
		return wrapper
	}

	beforeEach(() => {
		setActivePinia(createPinia())
		currentControl = '(mount)'
		vueErrors = []
		rejections = []
		onRejection = (reason) => rejections.push(`${currentControl}: ${reason}`)
		process.on('unhandledRejection', onRejection)
		swallowed = []
		vi.spyOn(console, 'error').mockImplementation((...args) => {
			const text = args.map(String).join(' ')
			if (/before initialization|of null/.test(text)) swallowed.push(`${currentControl}: ${text}`)
		})
		globalThis.fetch = vi.fn(fakeFetch)
		// jsdom lacks visualViewport, which Vuetify's menu positioning reads.
		vi.stubGlobal(
			'visualViewport',
			Object.assign(new EventTarget(), { width: 1280, height: 800, scale: 1 })
		)
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		process.off('unhandledRejection', onRejection)
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		document.body.innerHTML = ''
	})

	it('precondition: Cesium is not loaded and there is no viewer', () => {
		expect(cesiumProvider.isInitialized()).toBe(false)
		expect(() => cesiumProvider.get()).toThrow(/before initialization/)
		expect(useGlobalStore().cesiumViewer).toBeNull()
	})

	it('raises no error when every control is clicked and a search is run', async () => {
		mountPanel()
		await settle()

		// Not vacuous: the sidebar rendered its default (Layers) tab with real controls.
		const content = document.body.querySelector('.sidebar-content')
		expect(content?.querySelectorAll(INTERACTIVE).length).toBeGreaterThanOrEqual(5)

		const clicked = await clickEverything()
		await searchEverywhere()
		await clickEverything()
		await settle()

		expect(clicked).toBeGreaterThan(0)
		// One assertion so a failure lists every channel at once.
		expect({ vueErrors, rejections, swallowed }).toEqual({
			vueErrors: [],
			rejections: [],
			swallowed: [],
		})
	})

	it('keeps the tab content inert behind a loading hint until the viewer is set', async () => {
		mountPanel()
		await settle()

		const content = document.body.querySelector('.sidebar-content')
		expect(content?.hasAttribute('inert')).toBe(true)
		const hint = document.body.querySelector('.viewer-loading-hint')
		expect(hint?.getAttribute('role')).toBe('status')
		expect(hint?.textContent).toMatch(/loading map/i)

		useGlobalStore().setCesiumViewer({ imageryLayers: {}, scene: {}, camera: {} })
		await settle()

		expect(document.body.querySelector('.sidebar-content')?.hasAttribute('inert')).toBe(false)
		expect(document.body.querySelector('.viewer-loading-hint')).toBeNull()
	})
})
