// Custom base test with automatic external API mocking.
//
// All tests that import `test` from this module get mocked APIs
// by default. Opt out per file with `test.use({ mockAPIs: false })`.
//
// Override a single API in a test:
//   await page.unroute('**/wms/proxy*')
//   await page.route('**/wms/proxy*', route => route.fulfill({ status: 503 }))
import { test as base } from '@playwright/test'
import { setupAllApiMocks } from '../setup/api-mocks'

export const test = base.extend<{ mockAPIs: boolean; apiMocking: undefined }>({
	mockAPIs: [true, { option: true }],
	apiMocking: [
		async ({ page, mockAPIs }, use) => {
			if (mockAPIs) {
				await setupAllApiMocks(page)
			}
			await use()
		},
		{ auto: true },
	],
})

export { expect } from '@playwright/test'
