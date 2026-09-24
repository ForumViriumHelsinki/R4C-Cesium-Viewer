/**
 * The app must load its static data on any page path (#994).
 *
 * nginx and Vite both serve the SPA for unmatched paths, so the page can load
 * at a nested path. A page-relative URL such as `./assets/data/hsy_po.json`
 * then resolves under that path, receives `index.html`, and the content-type
 * guard in `loadGeoJsonDataSource` (#813) returns no entities: the postal-code
 * layer is missing and nothing reports it. Root-relative URLs load the same
 * file on every path.
 *
 * Needs no database: the postal-code GeoJSON is a static file in
 * `public/assets/data/`. Needs a `VITE_E2E_TEST=true` build for
 * `window.__viewer`.
 */

import { expect, test } from '../fixtures/test-fixture'

test.describe('App served at a nested path (#994)', () => {
	test(
		'loads the postal-code layer from root-relative asset URLs',
		{ tag: ['@e2e'] },
		async ({ page }) => {
			test.setTimeout(90_000)

			const pageErrors: string[] = []
			page.on('pageerror', (error) => pageErrors.push(error.message))
			const dataRequests: string[] = []
			page.on('request', (request) => {
				const { pathname } = new URL(request.url())
				if (pathname.includes('/assets/data/')) dataRequests.push(pathname)
			})

			await page.goto('/a/b')

			await page.waitForFunction(
				() => {
					const viewer = (
						window as {
							__viewer?: {
								dataSources?: {
									_dataSources?: Array<{ name?: string; entities?: { values: unknown[] } }>
								}
							}
						}
					).__viewer
					return (viewer?.dataSources?._dataSources ?? []).some(
						(ds) => ds.name === 'PostCodes' && (ds.entities?.values.length ?? 0) > 0
					)
				},
				undefined,
				{ timeout: 60_000 }
			)

			// Every static data request went to the root, not under /a/.
			expect(dataRequests).toContain('/assets/data/hsy_po.json')
			expect(dataRequests.filter((path) => !path.startsWith('/assets/'))).toEqual([])
			expect(pageErrors).toEqual([])
		}
	)
})
