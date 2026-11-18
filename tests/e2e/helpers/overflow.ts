/**
 * Layout-overflow detection for tests/e2e/layout/panel-overflow.spec.ts.
 *
 * `findOverflow` runs in the page and returns the outermost visible elements
 * inside the sidebar or an open analysis drawer that extend past the nearest
 * ancestor that clips or scrolls them horizontally, or past the viewport.
 */
import { expect, type Page, test } from '@playwright/test'

export type Overflow = { element: string; reason: string }

/** The registry fields the helpers need to open and locate a panel. */
export type PanelEntry = {
	label: string
	title?: string
	placement: 'inline' | 'drawer' | 'expansion'
}

/**
 * Runs in the browser; must stay self-contained. `scanned` counts the on-screen
 * containers checked, so a closed sidebar cannot pass as "no overflow".
 */
export function findOverflow(): { scanned: number; overflows: Overflow[] } {
	const TOLERANCE = 2
	const roots = [...document.querySelectorAll('.control-panel, .analysis-panel')]
	const shown = (el: Element) => {
		const r = el.getBoundingClientRect()
		return (
			r.width > 1 &&
			r.height > 1 &&
			el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
		)
	}
	const clipper = (el: Element) => {
		for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
			const overflowX = getComputedStyle(a).overflowX
			if (overflowX !== 'visible') return { el: a, overflowX }
		}
		return null
	}
	const describe = (el: Element) => {
		const id = el.id ? `#${el.id}` : ''
		const classes = [...el.classList]
			.slice(0, 3)
			.map((c) => `.${c}`)
			.join('')
		const text = ((el as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)
		return `${el.tagName.toLowerCase()}${id}${classes}${text ? ` "${text}"` : ''}`
	}
	// Elements that sit outside their box by design: slider thumbs overhang the
	// track, inactive tab panes are parked one pane-width aside, the collapsed
	// rail clips its labels.
	// A tab pane lying wholly outside its window is mid-slide and not visible.
	const parked = (el: Element) => {
		const pane = el.closest('.v-window-item')
		const win = pane?.closest('.v-window')
		if (!pane || !win) return false
		const p = pane.getBoundingClientRect()
		const w = win.getBoundingClientRect()
		return p.right <= w.left + TOLERANCE || p.left >= w.right - TOLERANCE
	}
	const exempt = (el: Element) =>
		el.closest(
			'.v-slider-thumb, .v-slider-track, .rail-nav, .v-window-item:not(.v-window-item--active)'
		) || parked(el)

	const flagged: Array<{ node: Element } & Overflow> = []
	let scanned = 0
	for (const root of roots) {
		if (!shown(root)) continue
		const rootRect = root.getBoundingClientRect()
		// A closed drawer is translated off-screen, not hidden.
		if (rootRect.left >= innerWidth - TOLERANCE || rootRect.right <= TOLERANCE) continue
		scanned++
		for (const el of root.querySelectorAll('*')) {
			if (!shown(el) || exempt(el)) continue
			if (flagged.some((f) => f.node.contains(el))) continue
			const r = el.getBoundingClientRect()
			let reason: string | null = null
			const c = clipper(el)
			if (c) {
				const box = c.el.getBoundingClientRect()
				const left = box.left + c.el.clientLeft
				const right = left + c.el.clientWidth
				if (r.right > right + TOLERANCE || r.left < left - TOLERANCE) {
					const kind = c.overflowX === 'hidden' || c.overflowX === 'clip' ? 'clipped' : 'scrolls'
					reason = `${kind} inside ${describe(c.el)}: element x ${Math.round(r.left)}–${Math.round(r.right)}, box x ${Math.round(left)}–${Math.round(right)}`
				}
			}
			if (!reason && (r.right > innerWidth + TOLERANCE || r.left < -TOLERANCE)) {
				reason = `past the viewport: element x ${Math.round(r.left)}–${Math.round(r.right)}, viewport width ${innerWidth}`
			}
			if (reason) flagged.push({ node: el, element: describe(el), reason })
		}
	}
	return { scanned, overflows: flagged.map(({ element, reason }) => ({ element, reason })) }
}

/**
 * Opens the app and waits for the real viewer (not the CI Cesium mock that
 * `cesiumTest` injects): layout depends on the panels the app actually renders.
 * Reloads once if the viewer fails to initialise, which a busy dev server can cause.
 */
export async function openApp(page: Page) {
	for (let attempt = 1; ; attempt++) {
		await page.goto('/', { waitUntil: 'load' })
		const state = await page
			.waitForFunction(
				() => {
					const store = (window as any).globalStore
					if (store?.viewerInitFailed) return 'failed'
					return store?.cesiumViewer ? 'ready' : false
				},
				null,
				{ timeout: 90_000 }
			)
			.then((handle) => handle.jsonValue())
		if (state === 'ready') break
		if (attempt === 2) throw new Error('Cesium viewer failed to initialise twice')
	}
	await page.locator('.viewer-loading-hint').waitFor({ state: 'detached' })
}

export async function setLevelAndView(
	page: Page,
	level: string,
	view: string,
	postalCode = '00100'
) {
	await page.evaluate(
		([level, view, postalCode]) => {
			const store = (window as any).globalStore
			store.setPostalCode(postalCode)
			store.setView(view)
			store.setLevel(level)
		},
		[level, view, postalCode]
	)
	// Opening a drawer panel rails the sidebar, and below md it may start hidden.
	await page.evaluate(() => (window as any).toggleStore.setSidebarMode('expanded'))
}

/**
 * Opens a sidebar tab and waits until its pane has finished sliding in.
 * Clicks through the DOM: the disclaimer scrim would intercept a pointer click.
 * @returns what was still moving when the stability wait gave up, or null
 */
export async function openSidebarTab(page: Page, name: string) {
	const tab = page
		.locator('.sidebar-tabs [role="tab"]', { hasText: new RegExp(`^\\s*${name}\\s*$`, 'i') })
		.first()
	await tab.evaluate((el: HTMLElement) => el.click())
	await expect(tab, `sidebar tab ${name} selected`).toHaveAttribute('aria-selected', 'true')
	return noteUnsettled(`after opening the ${name} tab`, await waitForLayoutStable(page))
}

const ANIMATED = [
	'.control-panel',
	'.analysis-panel',
	'.tab-window .v-window-item--active',
	'.v-expansion-panel-text',
]

/**
 * Polls the boxes that animate (sidebar, analysis drawer, active tab pane,
 * expansion panels) until three samples 150 ms apart agree. Transitions in
 * Vuetify leave no single class to wait on, but they all move or resize these.
 * @returns null once settled, or which boxes changed between the last two
 *   samples when `timeout` ran out
 */
async function waitForLayoutStable(page: Page, timeout = 10_000): Promise<string | null> {
	const sample = () =>
		page.evaluate(
			(selectors) =>
				[...document.querySelectorAll(selectors.join(', '))].map((el) => {
					const r = el.getBoundingClientRect()
					const title = el
						.closest('.v-expansion-panel')
						?.querySelector('.v-expansion-panel-title')
						?.textContent?.trim()
					const name = selectors.find((s) => el.matches(s)) ?? el.tagName
					return {
						name: title ? `${name} "${title}"` : name,
						box: `x ${Math.round(r.left)}–${Math.round(r.right)}, h ${Math.round(r.height)}`,
					}
				}),
			ANIMATED
		)
	type Box = Awaited<ReturnType<typeof sample>>[number]
	const changes = (a: Box[], b: Box[]) =>
		a.length !== b.length
			? [
					`${b.length - a.length > 0 ? 'added' : 'removed'} ${Math.abs(b.length - a.length)} box(es)`,
				]
			: b.flatMap((box, i) =>
					box.box === a[i].box ? [] : [`${box.name}: ${a[i].box} → ${box.box}`]
				)
	const deadline = Date.now() + timeout
	let previous = await sample()
	let moved: string[] = []
	let stable = 0
	while (stable < 2) {
		if (Date.now() > deadline) return moved.join('; ')
		await page.waitForTimeout(150)
		const current = await sample()
		const delta = changes(previous, current)
		if (delta.length > 0) moved = delta
		stable = delta.length === 0 ? stable + 1 : 0
		previous = current
	}
	return null
}

/**
 * Records a stability timeout on the test as a `layout-unstable` annotation,
 * so the case still scans and a red result means an overflow.
 */
function noteUnsettled(where: string, moved: string | null) {
	if (moved === null) return null
	const description = `layout still moving ${where}: ${moved}`
	test.info().annotations.push({ type: 'layout-unstable', description })
	console.warn(description)
	return description
}

/**
 * Asserts the surface a registry entry opens is on screen: the drawer inside
 * the viewport with the entry's title and its component mounted, the inline
 * card with its title and its component mounted, or the entry's expansion panel
 * expanded. A mounted component can be legitimately empty (Climate Adaptation
 * at start level), so none of these require the content to have a size.
 */
async function expectPanelShown(page: Page, entry: PanelEntry) {
	const title = entry.title ?? entry.label // analysisTitle() in the registry
	if (entry.placement === 'drawer') {
		const drawer = page.locator('.analysis-panel')
		await expect(drawer, `${title} drawer in the viewport`).toBeInViewport()
		await expect(drawer.locator('.v-card-title'), `${title} drawer title`).toContainText(title)
		await expect(
			drawer.locator('.v-card-text > *').first(),
			`${title} drawer content mounted`
		).toBeAttached()
	} else if (entry.placement === 'inline') {
		const card = page.locator('.control-panel .chart-card', {
			has: page.locator('.chart-card__header', { hasText: title }),
		})
		// The lazy component renders nothing until its chunk loads; the header
		// renders at once. Attached, not visible: a chart with no data for the
		// view (Building Heat Data in grid) mounts with an empty box.
		await expect(
			card.locator(':scope > :not(.chart-card__header)').first(),
			`${title} inline card content mounted`
		).toBeAttached()
	} else {
		const header = page.locator('.control-panel .v-expansion-panel-title', {
			hasText: entry.label,
		})
		await expect(header.first(), `${entry.label} expansion panel expanded`).toHaveAttribute(
			'aria-expanded',
			'true'
		)
	}
}

/**
 * Clicks a registry entry's button, asserts what it opens is on screen, and
 * waits for it to settle.
 * @returns what was still moving when the stability wait gave up, or null
 */
export async function openPanel(page: Page, entry: PanelEntry) {
	const button = page.locator('.control-panel button', { hasText: entry.label }).first()
	await button.waitFor({ state: 'visible', timeout: 10_000 })
	// An expansion-panel header toggles; leave it open if a previous test opened it.
	if ((await button.getAttribute('aria-expanded')) !== 'true') {
		await button.evaluate((el: HTMLElement) => el.click())
	}
	// Lazy panels mount after their chunk loads, then animate open or slide in.
	await expectPanelShown(page, entry)
	return noteUnsettled(`after opening ${entry.label}`, await waitForLayoutStable(page))
}
/** Closes the analysis drawer and any open expansion panel. */
export async function closePanels(page: Page) {
	await page.evaluate(() => {
		;(document.querySelector('[aria-label="Close analysis panel"]') as HTMLElement | null)?.click()
		for (const header of document.querySelectorAll(
			'.control-panel .v-expansion-panel-title[aria-expanded="true"]'
		)) {
			;(header as HTMLElement).click()
		}
	})
}
