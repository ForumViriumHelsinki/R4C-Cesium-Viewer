/**
 * Layout overflow in Analysis panels: fails when a panel's content extends past
 * the box that clips or scrolls it, or past the viewport (#1095, #1103).
 *
 * Runs in the overflow-desktop/-tablet/-mobile projects against the mock API
 * (`just test-overflow`). OVERFLOW_PANELS selects the panels: a comma-separated
 * list of registry ids, or `all` (the default). `scripts/overflow-targets.mjs`
 * computes it from a branch's changed files.
 */
import { expect, type Page, test } from '@playwright/test'
import { ANALYSES } from '../../../src/constants/analysisRegistry.js'
import {
	closePanels,
	findOverflow,
	openApp,
	openPanel,
	openSidebarTab,
	setLevelAndView,
} from '../helpers/overflow'

const ALL_VIEWS = ['capitalRegion', 'grid', 'helsinki']
const requested = (process.env.OVERFLOW_PANELS ?? 'all').trim()
const selected =
	requested === 'all'
		? ANALYSES
		: ANALYSES.filter((entry) => requested.split(',').includes(entry.id))

const unknown =
	requested === 'all' ? [] : requested.split(',').filter((id) => !ANALYSES.some((e) => e.id === id))
if (unknown.length > 0)
	throw new Error(`OVERFLOW_PANELS names unknown panels: ${unknown.join(', ')}`)

const tabName = (tab: string) => tab[0].toUpperCase() + tab.slice(1)

// One page per worker: loading the viewer for every case would dominate the run.
let page: Page
test.beforeAll(async ({ browser }) => {
	test.setTimeout(180_000)
	page = await browser.newPage()
	await openApp(page)
})
test.afterAll(async () => {
	await page?.close()
})
test.afterEach(async () => {
	await closePanels(page)
})

test.describe('Analysis panel overflow @layout', () => {
	for (const entry of selected) {
		for (const level of entry.levels) {
			for (const view of entry.views ?? ALL_VIEWS) {
				test(`${entry.label} at ${level} / ${view}`, async () => {
					await setLevelAndView(page, level, view)
					await openSidebarTab(page, tabName(entry.tab))
					await openPanel(page, entry.label)
					const { scanned, overflows } = await page.evaluate(findOverflow)
					expect(scanned, 'sidebar or analysis drawer on screen').toBeGreaterThan(0)
					expect(overflows).toEqual([])
				})
			}
		}
	}
})

test.describe('overflow detector', () => {
	test('flags the pre-#1095 Building Heat Data timeline', async () => {
		// The 400px minimum only applied above 768px, so only desktop can show it.
		test.skip(
			test.info().project.name !== 'overflow-desktop',
			'the old width overflowed on desktop only'
		)
		await setLevelAndView(page, 'building', 'capitalRegion')
		await openSidebarTab(page, 'Analysis')
		const restore = await page.addStyleTag({
			content: '.timeline-section .timeline-card { min-width: 400px !important; }',
		})
		try {
			await openPanel(page, 'Building Heat Data')
			const { overflows } = await page.evaluate(findOverflow)
			expect(overflows.map((f) => f.element)).toContainEqual(
				expect.stringContaining('timeline-card')
			)
		} finally {
			await restore.evaluate((el) => (el as HTMLStyleElement).remove())
		}
	})
})
