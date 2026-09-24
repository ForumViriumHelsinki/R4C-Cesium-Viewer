/**
 * Harness for the Vitest-driven performance suite (load.test.ts).
 *
 * It exists so the suite measures the app rather than Playwright (#961):
 * - Pages are opened with openPage() and closed by closeTrackedPages() after
 *   every test, so a test that times out cannot leave a live Cesium page
 *   rendering and fetching tiles through the tests after it.
 * - gotoReady() waits for the viewer (window.__viewer), a sized map canvas and
 *   no active global loading overlay, instead of the first <canvas> in the DOM,
 *   which exists as soon as the viewer is constructed.
 * - clickMap() dispatches a mouse click at canvas coordinates. A locator click
 *   first waits for Playwright's visible/enabled/stable checks, each of which
 *   needs the page's main thread; on a starved SwiftShader runner that wait
 *   alone took seconds per click.
 * - Per-click latency, a round-trip responsiveness probe and long-task totals
 *   are logged and written to PERF_RESULTS_DIR as informational output. On a
 *   failed test the page's screenshot and Playwright trace are saved there too.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'

/** Where metrics and failure artifacts go; the CI job uploads this directory. */
const RESULTS_DIR = process.env.PERF_RESULTS_DIR ?? 'performance-results'

/** The Cesium widget canvas. A bare `canvas` selector also matches other canvases. */
export const MAP_CANVAS = '#cesiumContainer canvas'

interface PageMetrics {
	readyMs: number | null
	clickMs: number[]
	probeMs: number[]
	canvasBox: { x: number; y: number; width: number; height: number } | null
}

const trackedPages = new Map<Page, PageMetrics>()

/** Counts PerformanceObserver long tasks (main-thread blocks over 50 ms) in the page. */
function installLongTaskCounter(): void {
	const stats = { count: 0, totalMs: 0, maxMs: 0 }
	;(window as unknown as { __perfLongTasks: typeof stats }).__perfLongTasks = stats
	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				stats.count += 1
				stats.totalMs += entry.duration
				stats.maxMs = Math.max(stats.maxMs, entry.duration)
			}
		}).observe({ type: 'longtask', buffered: true })
	} catch {
		// longtask is Chromium-only; leave the counters at zero elsewhere.
	}
}

/** Opens a page that closeTrackedPages() will close, with tracing and a long-task counter. */
export async function openPage(browser: Browser): Promise<Page> {
	const page = await browser.newPage()
	trackedPages.set(page, { readyMs: null, clickMs: [], probeMs: [], canvasBox: null })
	await page.addInitScript(installLongTaskCounter)
	// Actions, console and network only: DOM snapshots and a screencast would add
	// renderer work to the very thread these tests measure.
	await page.context().tracing.start({ screenshots: false, snapshots: false })
	return page
}

function metricsFor(page: Page): PageMetrics {
	const metrics = trackedPages.get(page)
	if (!metrics) throw new Error('page was not opened with openPage()')
	return metrics
}

/**
 * Navigates and waits until the map can take input: window.__viewer exists,
 * the map canvas has a size, and the global loading overlay is not active. Then
 * hides the disclaimer dialog and lets clicks pass through the floating controls.
 * @returns milliseconds from navigation to ready
 */
export async function gotoReady(page: Page, url: string, timeoutMs: number): Promise<number> {
	const start = Date.now()
	await page.goto(url, { timeout: timeoutMs })
	await page.waitForFunction(
		(selector) => {
			const canvas = document.querySelector(selector) as HTMLCanvasElement | null
			const viewer = (window as unknown as { __viewer?: unknown }).__viewer
			return Boolean(viewer && canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0)
		},
		MAP_CANVAS,
		{ timeout: timeoutMs, polling: 250 }
	)
	// LoadingIndicator's `.loading-overlay` is an eager v-overlay: its root is always
	// in the DOM and laid out, so visibility says nothing. It blocks input only
	// while `v-overlay--active`. The compact "Loading N layers..." snackbar does
	// not block and, while viewport buildings stream in, may never go away.
	await page.waitForFunction(
		() => document.querySelector('.loading-overlay.v-overlay--active') === null,
		undefined,
		{ timeout: timeoutMs, polling: 250 }
	)
	await removeBlockingOverlays(page)
	const readyMs = Date.now() - start
	metricsFor(page).readyMs = readyMs
	return readyMs
}

/**
 * Dismiss the disclaimer dialog and let canvas clicks pass through the floating
 * map controls. Mirrors tests/fixtures/cesium-fixture.ts `removeBlockingOverlays`.
 * The injected CSS persists, so scrims that mount later stay hidden.
 */
async function removeBlockingOverlays(page: Page): Promise<void> {
	await page.evaluate(() => {
		document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
			const text = dialog.textContent || ''
			if (
				text.includes('R4C Climate Demo') ||
				text.includes('Demo only') ||
				text.includes('disclaimer')
			) {
				dialog.remove()
			}
		})

		// Remove scrims that block interactions (but NOT the MapClickLoadingOverlay)
		document.querySelectorAll('.v-overlay__scrim').forEach((scrim) => {
			if (!scrim.closest('.map-click-loading-overlay')) {
				scrim.remove()
			}
		})

		// The controls stay rendered (realistic layout and cost); they only stop
		// intercepting pointer events aimed at the map beneath them.
		const passthroughControls = [
			'.control-panel',
			'.camera-controls-container',
			'.map-controls',
			'.map-overlay-controls',
			'.zoom-controls',
			'.compass-assembly',
			'.timeline-compact',
		].join(', ')
		const style = document.createElement('style')
		style.textContent =
			'.v-overlay__scrim:not(.map-click-loading-overlay .v-overlay__scrim) { display: none !important; }' +
			`${passthroughControls} { pointer-events: none !important; }`
		document.head.appendChild(style)
	})
}

/**
 * Clicks the map at (x, y) relative to the map canvas, clamped inside it.
 * @returns milliseconds until the browser acknowledged the click
 */
export async function clickMap(page: Page, x: number, y: number): Promise<number> {
	const metrics = metricsFor(page)
	if (!metrics.canvasBox) {
		metrics.canvasBox = await page.locator(MAP_CANVAS).boundingBox()
		if (!metrics.canvasBox) throw new Error(`${MAP_CANVAS} has no bounding box`)
	}
	const box = metrics.canvasBox
	const clamp = (value: number, size: number) => Math.min(Math.max(value, 1), size - 1)
	const start = performance.now()
	await page.mouse.click(box.x + clamp(x, box.width), box.y + clamp(y, box.height))
	const ms = performance.now() - start
	metrics.clickMs.push(ms)
	return ms
}

/**
 * Round-trip time of an empty page.evaluate: how long the page's main thread
 * takes to get to a new task. This is the "page is not blocked" measurement.
 */
export async function probeResponsiveness(page: Page): Promise<number> {
	const start = performance.now()
	await page.evaluate(() => 0)
	const ms = performance.now() - start
	metricsFor(page).probeMs.push(ms)
	return ms
}

function summarise(values: number[]) {
	if (values.length === 0) return null
	const sorted = [...values].sort((a, b) => a - b)
	const at = (q: number) =>
		Math.round(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))])
	return {
		n: sorted.length,
		p50: at(0.5),
		p95: at(0.95),
		max: Math.round(sorted[sorted.length - 1]),
	}
}

/** Writes one JSON line to RESULTS_DIR/metrics.jsonl and echoes it to the log. */
export function recordMetric(test: string, data: Record<string, unknown>): void {
	const line = JSON.stringify({ test, ...data })
	console.log(`[perf] ${line}`)
	mkdirSync(RESULTS_DIR, { recursive: true })
	appendFileSync(join(RESULTS_DIR, 'metrics.jsonl'), `${line}\n`)
}

/** Resolves to `fallback` if `promise` rejects or takes longer than `ms`. */
function bounded<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const timeout = new Promise<T>((resolve) => {
		timer = setTimeout(() => resolve(fallback), ms)
	})
	return Promise.race([promise.catch(() => fallback), timeout]).finally(() => clearTimeout(timer))
}

const slug = (text: string) =>
	text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')

/**
 * Records metrics for, and closes, every page opened during the test. When the
 * test failed, saves each page's screenshot and trace to RESULTS_DIR first.
 * Every step is bounded and tolerates a hung, crashed or already-closed page, so
 * the pages are always closed.
 */
export async function closeTrackedPages(test: string, failed: boolean): Promise<void> {
	const pages = [...trackedPages.entries()]
	trackedPages.clear()
	await Promise.all(
		pages.map(async ([page, metrics], index) => {
			const name = `${slug(test)}-${index}`
			const longTasks = await bounded(
				page.evaluate(() => (window as unknown as { __perfLongTasks?: unknown }).__perfLongTasks),
				5_000,
				null
			)
			recordMetric(test, {
				page: index,
				failed,
				readyMs: metrics.readyMs,
				clickMs: summarise(metrics.clickMs),
				probeMs: summarise(metrics.probeMs),
				longTasks,
			})
			const tracing = page.context().tracing
			if (failed) {
				mkdirSync(RESULTS_DIR, { recursive: true })
				await bounded(page.screenshot({ path: join(RESULTS_DIR, `${name}.png`) }), 10_000, null)
				await bounded(
					tracing.stop({ path: join(RESULTS_DIR, `${name}-trace.zip`) }),
					20_000,
					undefined
				)
			} else {
				await bounded(tracing.stop(), 10_000, undefined)
			}
			// A page from browser.newPage() owns its context; closing it closes both.
			await bounded(page.close(), 10_000, undefined)
		})
	)
}
