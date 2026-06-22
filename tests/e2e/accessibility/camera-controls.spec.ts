/**
 * Camera Controls Accessibility Tests
 *
 * Tests the CameraControls component (src/components/CameraControls.vue), a pure
 * Vue 3 + SVG + DOM component mounted unconditionally in src/pages/CesiumViewer.vue.
 * It is NOT a Cesium internal compass widget rendered into the WebGL canvas, so it
 * renders in headless CI without a full WebGL context.
 *
 * The accessible interaction model is:
 * - `.compass-assembly` (role=group) with eight directional `.dir-btn` buttons
 *   (aria-label "Face <Direction>") that face the camera in a compass direction.
 * - A decorative, aria-hidden SVG compass (`.compass-ring` + `.compass-needle`).
 * - An `sr-only` role="status" aria-live region announcing the current heading.
 * - `.zoom-controls` (role=group) with "Zoom in" / "Zoom out" buttons.
 *
 * History: this suite was previously skipped (#623) because it queried
 * `.compass-control` / `#compass-description` — selectors that never existed in the
 * component (the spec assumed a single click-to-reset-North button + an
 * aria-describedby description element, neither of which the component has). It is
 * re-enabled here (#818) with the real selectors, split into DOM-only assertions
 * (run everywhere) and a Cesium-coupled `@cesium` subset driven via `window.__viewer`.
 *
 * Strategy: docs/core/TESTING.md → "Cesium UI Component Accessibility Testing Strategy".
 *
 * @tags @accessibility @e2e
 */

import { expect } from '@playwright/test'
import { TIMEOUTS, VIEWPORTS } from '../../config/constants'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import { TEST_TIMEOUTS } from '../helpers/test-helpers'

// The eight directional buttons, in template order. `name` is the on-button glyph,
// `label` is the accessible name fragment (aria-label = `Face <label>`), `degrees`
// is the heading the button faces the camera toward.
const DIRECTIONS = [
	{ name: 'N', label: 'North', degrees: 0 },
	{ name: 'NE', label: 'Northeast', degrees: 45 },
	{ name: 'E', label: 'East', degrees: 90 },
	{ name: 'SE', label: 'Southeast', degrees: 135 },
	{ name: 'S', label: 'South', degrees: 180 },
	{ name: 'SW', label: 'Southwest', degrees: 225 },
	{ name: 'W', label: 'West', degrees: 270 },
	{ name: 'NW', label: 'Northwest', degrees: 315 },
] as const

cesiumDescribe('Camera Controls Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e'] })

	cesiumTest.describe('Structure and Layout', () => {
		cesiumTest('renders the camera controls container', async ({ cesiumPage }) => {
			const container = cesiumPage.locator('.camera-controls-container')
			await expect(container).toBeVisible({ timeout: TIMEOUTS.ELEMENT_WAIT })
		})

		cesiumTest(
			'positions the container as an absolute top-left overlay',
			async ({ cesiumPage }) => {
				const container = cesiumPage.locator('.camera-controls-container')
				await expect(container).toBeVisible()

				const styles = await container.evaluate((el) => {
					const computed = window.getComputedStyle(el)
					return { position: computed.position, zIndex: computed.zIndex }
				})
				expect(styles.position).toBe('absolute')
				// z-index 400 keeps the controls above other map UI (see component scoped CSS).
				expect(parseInt(styles.zIndex, 10)).toBe(400)
			}
		)

		cesiumTest('does not block map interactions', async ({ cesiumPage }) => {
			const container = cesiumPage.locator('.camera-controls-container')
			await expect(container).toBeVisible()

			const cesiumContainer = cesiumPage.locator('#cesiumContainer')
			const interactive = await cesiumContainer.evaluate(
				(el) => window.getComputedStyle(el).pointerEvents !== 'none'
			)
			expect(interactive).toBeTruthy()
		})
	})

	cesiumTest.describe('Compass Display', () => {
		cesiumTest('groups the compass with an accessible label', async ({ cesiumPage }) => {
			const assembly = cesiumPage.locator('.compass-assembly')
			await expect(assembly).toBeVisible()
			await expect(assembly).toHaveAttribute('role', 'group')
			await expect(assembly).toHaveAttribute('aria-label', 'Camera direction controls')
		})

		cesiumTest(
			'renders the rotating compass ring with cardinal markers',
			async ({ cesiumPage }) => {
				const ring = cesiumPage.locator('.compass-ring')
				await expect(ring).toBeVisible()

				// All four cardinal markers (N, E, S, W) are present.
				await expect(ring.locator('text.compass-cardinal')).toHaveCount(4)

				// North marker is distinctly styled and reads "N".
				const north = ring.locator('text.compass-north')
				await expect(north).toHaveText('N')
			}
		)

		cesiumTest('renders the fixed compass needle', async ({ cesiumPage }) => {
			const needle = cesiumPage.locator('.compass-needle')
			await expect(needle).toBeVisible()
			await expect(needle.locator('.needle-north')).toBeAttached()
			await expect(needle.locator('.needle-south')).toBeAttached()
			await expect(needle.locator('.needle-center')).toBeAttached()
		})

		cesiumTest('applies a rotation transform to the compass ring', async ({ cesiumPage }) => {
			const ring = cesiumPage.locator('.compass-ring')
			await expect(ring).toBeVisible()

			const style = await ring.getAttribute('style')
			expect(style).toContain('transform')
			expect(style).toContain('rotate')
		})

		cesiumTest(
			'hides decorative SVG compass elements from assistive tech',
			async ({ cesiumPage }) => {
				// The ring/needle are purely visual; the sr-only status region carries the
				// real heading information, so both SVGs are aria-hidden.
				await expect(cesiumPage.locator('.compass-ring')).toHaveAttribute('aria-hidden', 'true')
				await expect(cesiumPage.locator('.compass-needle')).toHaveAttribute('aria-hidden', 'true')
			}
		)
	})

	cesiumTest.describe('Screen Reader Heading Status', () => {
		cesiumTest(
			'exposes a polite live status region with the current heading',
			async ({ cesiumPage }) => {
				const status = cesiumPage.locator('.compass-assembly .sr-only[role="status"]')
				await expect(status).toBeAttached()
				await expect(status).toHaveAttribute('aria-live', 'polite')

				const text = (await status.textContent())?.toLowerCase() ?? ''
				expect(text).toContain('current heading')
				expect(text).toContain('degrees')
			}
		)
	})

	cesiumTest.describe('Directional Buttons', () => {
		cesiumTest(
			'renders all eight directional buttons with accessible names',
			async ({ cesiumPage }) => {
				const controls = cesiumPage.locator('.camera-controls-container')
				for (const dir of DIRECTIONS) {
					// exact: true so "Face North" doesn't also match "Face Northeast"/"Face Northwest".
					const button = controls.getByRole('button', { name: `Face ${dir.label}`, exact: true })
					await expect(button).toBeVisible()
				}
			}
		)

		cesiumTest(
			'enables the directional buttons once the viewer is ready',
			async ({ cesiumPage }) => {
				// Buttons are :disabled until store.cesiumViewer is set (viewerReady). The
				// fixture initializes the viewer, so they should be enabled.
				const controls = cesiumPage.locator('.camera-controls-container')
				const north = controls.getByRole('button', { name: 'Face North', exact: true })
				await expect(north).toBeEnabled()
			}
		)

		cesiumTest('makes directional buttons keyboard focusable', async ({ cesiumPage }) => {
			const controls = cesiumPage.locator('.camera-controls-container')
			const east = controls.getByRole('button', { name: 'Face East', exact: true })
			await expect(east).toBeVisible()
			await east.focus()
			await expect(east).toBeFocused()
		})
	})

	cesiumTest.describe('Zoom Controls', () => {
		cesiumTest('groups the zoom controls with an accessible label', async ({ cesiumPage }) => {
			const zoom = cesiumPage.locator('.zoom-controls')
			await expect(zoom).toBeVisible()
			await expect(zoom).toHaveAttribute('role', 'group')
			await expect(zoom).toHaveAttribute('aria-label', 'Zoom controls')
		})

		cesiumTest('renders zoom in / zoom out buttons with icons', async ({ cesiumPage }) => {
			// Scope to .zoom-controls: MapOverlayControls renders a second "Zoom in"/"Zoom out"
			// pair with identical accessible names, so an unscoped query is ambiguous.
			const zoom = cesiumPage.locator('.zoom-controls')
			const zoomIn = zoom.getByRole('button', { name: 'Zoom in', exact: true })
			const zoomOut = zoom.getByRole('button', { name: 'Zoom out', exact: true })
			await expect(zoomIn).toBeVisible()
			await expect(zoomOut).toBeVisible()

			// Icons render as inline SVG but preserve their mdi-* class (see architecture.md).
			await expect(zoomIn.locator('.mdi-plus')).toBeAttached()
			await expect(zoomOut.locator('.mdi-minus')).toBeAttached()
		})

		cesiumTest('exposes exact aria-labels for the zoom buttons', async ({ cesiumPage }) => {
			const zoom = cesiumPage.locator('.zoom-controls')
			await expect(zoom.getByRole('button', { name: 'Zoom in', exact: true })).toHaveAttribute(
				'aria-label',
				'Zoom in'
			)
			await expect(zoom.getByRole('button', { name: 'Zoom out', exact: true })).toHaveAttribute(
				'aria-label',
				'Zoom out'
			)
		})

		cesiumTest('makes zoom buttons keyboard focusable', async ({ cesiumPage }) => {
			const zoom = cesiumPage.locator('.zoom-controls')
			const zoomIn = zoom.getByRole('button', { name: 'Zoom in', exact: true })
			await zoomIn.focus()
			await expect(zoomIn).toBeFocused()
		})
	})

	cesiumTest.describe('Responsive Behavior', () => {
		cesiumTest(
			'remains visible across desktop, tablet, and mobile viewports',
			async ({ cesiumPage }) => {
				for (const viewport of [VIEWPORTS.DESKTOP_HD, VIEWPORTS.TABLET, VIEWPORTS.MOBILE]) {
					await cesiumPage.setViewportSize(viewport)
					await cesiumPage.waitForFunction((width) => window.innerWidth === width, viewport.width, {
						timeout: TEST_TIMEOUTS.ELEMENT_SCROLL,
					})

					await expect(cesiumPage.locator('.camera-controls-container')).toBeVisible()
					await expect(cesiumPage.locator('.zoom-controls')).toBeVisible()
				}
			}
		)

		cesiumTest(
			'keeps directional buttons at a touch-friendly size on mobile',
			async ({ cesiumPage }) => {
				await cesiumPage.setViewportSize(VIEWPORTS.MOBILE)
				await cesiumPage.waitForFunction(
					(width) => window.innerWidth === width,
					VIEWPORTS.MOBILE.width
				)

				const north = cesiumPage
					.locator('.camera-controls-container')
					.getByRole('button', { name: 'Face North', exact: true })
				await expect(north).toBeVisible()
				const box = await north.boundingBox()
				expect(box).toBeTruthy()
				if (box) {
					// 28px base / 34px on coarse pointers; assert the WCAG 2.5.5-ish floor of 24px.
					expect(box.width).toBeGreaterThanOrEqual(24)
					expect(box.height).toBeGreaterThanOrEqual(24)
				}
			}
		)
	})

	// Heading/zoom reactivity is genuinely Cesium-coupled: it depends on a live
	// viewer camera. Driven via window.__viewer (the E2E-only global; see testing.md).
	cesiumTest.describe('Camera Reactivity', () => {
		cesiumTest.use({ tag: ['@accessibility', '@e2e', '@cesium'] })

		cesiumTest('faces the camera east when the East button is clicked', async ({ cesiumPage }) => {
			const hasViewer = await cesiumPage.evaluate(() =>
				Boolean((window as { __viewer?: unknown }).__viewer)
			)
			cesiumTest.skip(!hasViewer, 'No live Cesium viewer (window.__viewer) available')

			await cesiumPage
				.locator('.camera-controls-container')
				.getByRole('button', { name: 'Face East', exact: true })
				.click()

			// setHeading flies to heading 90° (1s animation). Poll the camera heading
			// (ground truth) until it settles near East.
			await cesiumPage.waitForFunction(
				() => {
					const viewer = (window as { __viewer?: { camera?: { heading?: number } } }).__viewer
					const Cesium = (window as { __cesium?: { Math: { toRadians: (d: number) => number } } })
						.__cesium
					if (!viewer?.camera || !Cesium) return false
					const target = Cesium.Math.toRadians(90)
					return Math.abs((viewer.camera.heading ?? 0) - target) < 0.05
				},
				undefined,
				{ timeout: TIMEOUTS.VERY_LONG }
			)

			// The sr-only status region should reflect the new heading for screen readers.
			const status = cesiumPage.locator('.compass-assembly .sr-only[role="status"]')
			await expect(status).toContainText(/East/i, { timeout: TIMEOUTS.LONG })
		})

		cesiumTest('zooms the camera closer when Zoom in is clicked', async ({ cesiumPage }) => {
			const initialHeight = await cesiumPage.evaluate(() => {
				const viewer = (
					window as { __viewer?: { camera?: { positionCartographic?: { height?: number } } } }
				).__viewer
				return viewer?.camera?.positionCartographic?.height ?? null
			})
			cesiumTest.skip(initialHeight === null, 'No live Cesium viewer camera available')

			await cesiumPage
				.locator('.zoom-controls')
				.getByRole('button', { name: 'Zoom in', exact: true })
				.click()

			await cesiumPage.waitForFunction(
				(start) => {
					const viewer = (
						window as { __viewer?: { camera?: { positionCartographic?: { height?: number } } } }
					).__viewer
					const height = viewer?.camera?.positionCartographic?.height
					return typeof height === 'number' && height < (start as number)
				},
				initialHeight,
				{ timeout: TIMEOUTS.VERY_LONG }
			)
		})
	})
})
