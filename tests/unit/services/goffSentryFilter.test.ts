/**
 * GOFF background-reconnect rejections must not reach Sentry (#956).
 *
 * The #735 fix called `event.preventDefault()` in a window
 * `unhandledrejection` listener. Sentry's globalHandlers integration captures
 * rejections through `window.onunhandledrejection` instead, and never reads
 * `event.defaultPrevented`, so every GOFF rejection kept arriving in Sentry
 * (R4C-CESIUM-VIEWER-1Z, and the #738 / #794 shapes). The existing tests only
 * covered `isGoffRejection`, so they passed while the events leaked.
 *
 * This file pins the layer that actually drops the events:
 *  1. `dropGoffRejectionEvent`, the `beforeSend` hook, for every GOFF shape.
 *  2. A real Sentry browser client with `globalHandlersIntegration` and a spy
 *     transport, fed through the real GOFF listener, counting envelopes.
 *  3. A static sweep: any global `unhandledrejection`/`error` listener in
 *     `src/` that calls `preventDefault()` must have a matching `beforeSend`
 *     filter wired into `Sentry.init` in `src/main.js`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import * as Sentry from '@sentry/vue'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as provider from '@/services/featureFlagProvider'

const REPO_ROOT = join(__dirname, '..', '..', '..')
const SRC_DIR = join(REPO_ROOT, 'src')

/** Cesium's RequestErrorEvent has the same three keys as GOFF shape C. */
class RequestErrorEvent {
	statusCode: number
	response: unknown
	responseHeaders: unknown
	constructor(statusCode: number, response: unknown, responseHeaders: unknown) {
		this.statusCode = statusCode
		this.response = response
		this.responseHeaders = responseHeaders
	}
}

function goffTypeError(): TypeError {
	const err = new TypeError("Failed to construct 'URL': Invalid URL")
	err.stack =
		"TypeError: Failed to construct 'URL': Invalid URL\n" +
		'    at GoFeatureFlagWebProvider.retryFetchAll (go-feature-flag-web-provider/dist/index.esm.js:1:1)'
	return err
}

function nullPrototypeShapeC(): Record<string, unknown> {
	const o = Object.create(null) as Record<string, unknown>
	o.response = {}
	o.responseHeaders = {}
	o.statusCode = 404
	return o
}

/** Every rejection shape `isGoffRejection` classifies as GOFF (#735, #738, #794). */
const GOFF_SHAPES: Array<[string, () => unknown]> = [
	['A: websocket-init string', () => 'timeout of 5000 ms reached when initializing the websocket'],
	[
		'A: websocket-init Error',
		() => new Error('timeout of 5000 ms reached when initializing the websocket'),
	],
	['B: URL TypeError from the GoFeatureFlag stack', goffTypeError],
	[
		'C: plain {response, responseHeaders, statusCode}',
		() => ({ response: {}, responseHeaders: {}, statusCode: 404 }),
	],
	['C: null-prototype three-key object', nullPrototypeShapeC],
]

/** Rejections that must still reach Sentry. */
const CONTROL_SHAPES: Array<[string, () => unknown]> = [
	['unrelated Error', () => new Error('Cesium WebGL context lost')],
	['Cesium RequestErrorEvent', () => new RequestErrorEvent(503, {}, {})],
]

describe('dropGoffRejectionEvent — Sentry beforeSend filter (#956)', () => {
	const event = { event_id: 'abc' }

	for (const [label, make] of GOFF_SHAPES) {
		it(`drops ${label}`, () => {
			expect(provider.dropGoffRejectionEvent(event, { originalException: make() })).toBeNull()
		})
	}

	for (const [label, make] of CONTROL_SHAPES) {
		it(`keeps ${label}`, () => {
			expect(provider.dropGoffRejectionEvent(event, { originalException: make() })).toBe(event)
		})
	}

	it('keeps an event that carries no original exception', () => {
		expect(provider.dropGoffRejectionEvent(event, {})).toBe(event)
		expect(provider.dropGoffRejectionEvent(event, undefined)).toBe(event)
	})
})

describe('GOFF rejections through a real Sentry client (#956)', () => {
	type Envelope = [unknown, Array<[{ type: string }, Record<string, unknown>]>]
	const envelopes: Envelope[] = []
	let client: Sentry.BrowserClient
	let warnSpy: ReturnType<typeof vi.spyOn>

	beforeAll(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		// Same order as production: Sentry.init runs at main.js load, the GOFF
		// listener is installed later from initializeFeatureFlags().
		client = new Sentry.BrowserClient({
			dsn: 'https://public@sentry.example.invalid/1',
			transport: () => ({
				send: async (envelope) => {
					envelopes.push(envelope as unknown as Envelope)
					return {}
				},
				flush: async () => true,
			}),
			stackParser: Sentry.defaultStackParser,
			integrations: [
				Sentry.globalHandlersIntegration({ onerror: false, onunhandledrejection: true }),
			],
			beforeSend: provider.dropGoffRejectionEvent,
			sendClientReports: false,
		})
		Sentry.setCurrentClient(client)
		client.init()
		// Sentry assigns `globalThis.onunhandledrejection`. Vitest's jsdom
		// environment copies window properties onto the Node global as plain
		// accessors, so that assignment never reaches jsdom's event-handler
		// attribute and `dispatchEvent` would not call it. Register it as the
		// listener a browser creates for the attribute, at the same position:
		// after Sentry.init and before the GOFF listener.
		window.addEventListener('unhandledrejection', (event) => {
			globalThis.onunhandledrejection?.call(window, event)
		})
		provider.installGoffRejectionHandler()
	})

	afterAll(async () => {
		await client.close()
		warnSpy.mockRestore()
	})

	function dispatchRejection(reason: unknown): PromiseRejectionEvent {
		const promise = Promise.reject(reason)
		promise.catch(() => {})
		const event = new PromiseRejectionEvent('unhandledrejection', {
			reason,
			promise,
			cancelable: true,
		})
		window.dispatchEvent(event)
		return event
	}

	it('sends only the control rejections, although the GOFF listener cancels the rest', async () => {
		const goffEvents = GOFF_SHAPES.map(([, make]) => dispatchRejection(make()))
		const controlEvents = CONTROL_SHAPES.map(([, make]) => dispatchRejection(make()))
		await client.flush(2000)

		// The GOFF listener did run and cancel every GOFF event: this is the
		// #735 mechanism, and it does not stop Sentry on its own.
		expect(goffEvents.map((e) => e.defaultPrevented)).toEqual(GOFF_SHAPES.map(() => true))
		expect(controlEvents.map((e) => e.defaultPrevented)).toEqual(CONTROL_SHAPES.map(() => false))

		const sentValues = envelopes.flatMap(([, items]) =>
			items
				.filter(([header]) => header.type === 'event')
				.map(([, payload]) => {
					const exception = payload.exception as { values: Array<{ value?: string }> }
					return exception.values[0]?.value ?? ''
				})
		)
		expect(sentValues, `sent: ${JSON.stringify(sentValues)}`).toHaveLength(CONTROL_SHAPES.length)
		expect(sentValues).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Cesium WebGL context lost'),
				expect.stringContaining('statusCode'),
			])
		)
	})
})

describe('static sweep: preventDefault() is not Sentry suppression (#956)', () => {
	/**
	 * Files whose global `unhandledrejection`/`error` listener calls
	 * `preventDefault()`, mapped to the `beforeSend` filter in `Sentry.init`
	 * that keeps the same events out of Sentry. A new listener fails this test
	 * until it is listed here with its filter.
	 */
	const SUPPRESSING_LISTENERS: Record<string, string> = {
		'src/services/featureFlagProvider.ts': 'dropGoffRejectionEvent',
	}

	function sourceFiles(dir: string): string[] {
		return readdirSync(dir).flatMap((name) => {
			const path = join(dir, name)
			if (statSync(path).isDirectory()) return sourceFiles(path)
			return /\.(js|ts|vue)$/.test(name) ? [path] : []
		})
	}

	/** Return the text of each listener call, from `addEventListener(` to its closing paren. */
	function listenerCalls(text: string): string[] {
		const calls: string[] = []
		const start = /addEventListener\(\s*['"](?:unhandledrejection|error)['"]/g
		for (const match of text.matchAll(start)) {
			let depth = 0
			let i = match.index + 'addEventListener'.length
			for (; i < text.length; i++) {
				if (text[i] === '(') depth++
				else if (text[i] === ')' && --depth === 0) break
			}
			calls.push(text.slice(match.index, i + 1))
		}
		return calls
	}

	const suppressing = sourceFiles(SRC_DIR)
		.filter((file) =>
			listenerCalls(readFileSync(file, 'utf8')).some((call) => call.includes('preventDefault('))
		)
		.map((file) => relative(REPO_ROOT, file))
		.sort()

	it('finds exactly the listed suppressing listeners', () => {
		expect(suppressing).toEqual(Object.keys(SUPPRESSING_LISTENERS).sort())
	})

	it('wires each listener’s filter into Sentry.init as beforeSend', () => {
		const mainJs = readFileSync(join(SRC_DIR, 'main.js'), 'utf8')
		for (const filter of Object.values(SUPPRESSING_LISTENERS)) {
			expect(mainJs).toMatch(new RegExp(`beforeSend:\\s*${filter}\\b`))
		}
	})
})
