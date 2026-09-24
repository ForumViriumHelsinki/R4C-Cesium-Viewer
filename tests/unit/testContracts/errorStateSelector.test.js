/**
 * Test-suite contract: ERROR_STATE_SELECTOR (tests/e2e/helpers/error-states.ts)
 * matches the error components the app renders and does not match a working
 * control coloured `error`. Checked against real Vuetify rendering, because the
 * selector depends on the classes Vuetify emits for `type`/`color="error"`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CameraControls from '@/components/CameraControls.vue'
import { ERROR_STATE_SELECTOR } from '../../e2e/helpers/error-states'

// The probe the accessibility specs used before #947.
const SUBSTRING_PROBE = '[class*="error"], [class*="Error"]'

const vuetify = createVuetify({ components, directives })

function mountInDocument(component, options = {}) {
	return mount(component, {
		attachTo: document.body,
		global: { plugins: [vuetify] },
		...options,
	})
}

describe('ERROR_STATE_SELECTOR', () => {
	let wrapper

	beforeEach(() => {
		setActivePinia(createPinia())
	})

	afterEach(() => {
		wrapper?.unmount()
		wrapper = undefined
		document.body.innerHTML = ''
		vi.unstubAllGlobals()
	})

	it('does not count the compass North button, which the substring probe does', async () => {
		// With no viewer the heading is 0, so North is the active direction and
		// CameraControls colours its button `error`.
		wrapper = mountInDocument(CameraControls)
		await nextTick()

		const north = document.querySelector('button[aria-label="Face North"]')
		expect(north).not.toBeNull()
		expect(north.classList.contains('bg-error')).toBe(true)

		expect(document.querySelectorAll(SUBSTRING_PROBE).length).toBeGreaterThan(0)
		expect(document.querySelectorAll(ERROR_STATE_SELECTOR)).toHaveLength(0)
	})

	it.each([
		['flat', 'bg-error'],
		['tonal', 'text-error'],
	])('matches a v-alert type="error" (%s variant)', async (variant, colourClass) => {
		wrapper = mountInDocument({
			render: () => h(components.VAlert, { type: 'error', variant }, () => 'Load failed'),
		})
		await nextTick()

		const alert = document.querySelector('.v-alert')
		expect(alert.classList.contains(colourClass)).toBe(true)
		expect(alert.matches(ERROR_STATE_SELECTOR)).toBe(true)
	})

	it('does not match a v-alert type="warning"', async () => {
		wrapper = mountInDocument({
			render: () => h(components.VAlert, { type: 'warning', variant: 'tonal' }, () => 'Conflict'),
		})
		await nextTick()

		expect(document.querySelector('.v-alert').matches(ERROR_STATE_SELECTOR)).toBe(false)
	})

	it('matches a v-snackbar color="error"', async () => {
		// VOverlay reads the bare global `visualViewport`, which jsdom lacks.
		vi.stubGlobal('visualViewport', undefined)
		wrapper = mountInDocument({
			render: () =>
				h(components.VApp, {}, () =>
					h(
						components.VSnackbar,
						{ modelValue: true, color: 'error', timeout: -1 },
						() => 'Failed to Load Map Viewer'
					)
				),
		})
		await nextTick()
		await nextTick()

		expect(document.querySelectorAll(ERROR_STATE_SELECTOR)).toHaveLength(1)
	})

	it('names only app error classes that exist in src/', () => {
		const appClasses = ERROR_STATE_SELECTOR.split(',')
			.map((selector) => selector.trim())
			.filter((selector) => /^\.error-[a-z-]+$/.test(selector))
			.map((selector) => selector.slice(1))
		expect(appClasses.length).toBeGreaterThan(0)

		const srcDir = join(process.cwd(), 'src')
		const vueSources = readdirSync(srcDir, { recursive: true })
			.filter((entry) => entry.endsWith('.vue'))
			.map((entry) => readFileSync(join(srcDir, entry), 'utf8'))

		const missing = appClasses.filter(
			(cls) => !vueSources.some((text) => new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`).test(text))
		)
		expect(missing).toEqual([])
	})
})
