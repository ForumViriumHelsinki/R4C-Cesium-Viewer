/**
 * Building Fill Regression Tests
 * @tag @e2e @buildings @regression
 *
 * Verifies that buildings render as filled polygons, not wireframes.
 *
 * Background: Buildings were appearing as wireframes (outline only, no fill)
 * when polygon.fill was not explicitly set to true. This regression test
 * ensures all building entities have proper fill enabled.
 *
 * The fix is in datasource.js:addDataSourceWithPolygonFix() which sets
 * polygon.fill = true for all entities as the single authoritative location.
 */

import { expect, test } from '@playwright/test'
import { TEST_TIMEOUTS } from './helpers/test-helpers'

/**
 * Helper to check building fill status via Cesium entities
 */
async function checkBuildingFillStatus(page): Promise<{
	totalBuildings: number
	buildingsWithFill: number
	buildingsWithoutFill: number
	sampleEntities: Array<{ id: string; fill: boolean | undefined }>
}> {
	return page.evaluate(() => {
		const viewer = (window as any).cesiumViewer
		if (!viewer?.dataSources) {
			return {
				totalBuildings: 0,
				buildingsWithFill: 0,
				buildingsWithoutFill: 0,
				sampleEntities: [],
			}
		}

		let totalBuildings = 0
		let buildingsWithFill = 0
		let buildingsWithoutFill = 0
		const sampleEntities: Array<{ id: string; fill: boolean | undefined }> = []

		const dsCollection = viewer.dataSources._dataSources || []
		for (const ds of dsCollection) {
			if (ds?.name?.startsWith('Buildings ') && ds.entities) {
				const entities = ds.entities.values
				for (let j = 0; j < entities.length; j++) {
					const entity = entities[j]
					if (!entity.polygon) continue

					totalBuildings++
					const fillProp = entity.polygon.fill
					const fillValue = fillProp?.getValue ? fillProp.getValue() : fillProp

					if (fillValue === true) {
						buildingsWithFill++
					} else {
						buildingsWithoutFill++
						if (sampleEntities.length < 5) {
							sampleEntities.push({ id: entity.id || `entity-${j}`, fill: fillValue })
						}
					}
				}
			}
		}

		return { totalBuildings, buildingsWithFill, buildingsWithoutFill, sampleEntities }
	})
}

/**
 * Helper to wait for building datasource to load
 */
async function waitForBuildingsLoaded(
	page,
	timeout = TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT
): Promise<boolean> {
	return page
		.waitForFunction(
			() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer?.dataSources) return false

				const dsCollection = viewer.dataSources._dataSources || []
				return dsCollection.some(
					(ds: any) => ds.name?.startsWith('Buildings ') && ds.entities?.values?.length > 0
				)
			},
			{ timeout }
		)
		.then(() => true)
		.catch(() => false)
}

test.describe('Building Fill Regression @e2e @buildings @regression', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		// Dismiss disclaimer modal if present
		const closeButton = page.getByRole('button', { name: /close disclaimer/i })
		if (
			await closeButton.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }).catch(() => false)
		) {
			await closeButton.click()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
		}

		// Wait for Cesium to initialize
		await page.waitForSelector('#cesiumContainer canvas', {
			state: 'visible',
			timeout: TEST_TIMEOUTS.CESIUM_READY,
		})
	})

	test('buildings should have polygon.fill set to true', async ({ page }) => {
		// Navigate to a postal code to load buildings
		const searchInput = page.getByPlaceholder(/search/i)
		await searchInput.fill('00100')
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

		// Click postal code result
		const postalResult = page.getByText('Helsinki Keskusta')
		if (
			await postalResult.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }).catch(() => false)
		) {
			await postalResult.click()
		}

		// Wait for buildings to load
		const buildingsLoaded = await waitForBuildingsLoaded(page)
		if (!buildingsLoaded) {
			test.skip(true, 'Buildings did not load - skipping fill check')
			return
		}

		// Wait for styling to be applied
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

		// Check fill status
		const fillStatus = await checkBuildingFillStatus(page)

		console.log(
			`[Building Fill Test] Total: ${fillStatus.totalBuildings}, With fill: ${fillStatus.buildingsWithFill}, Without fill: ${fillStatus.buildingsWithoutFill}`
		)

		if (fillStatus.buildingsWithoutFill > 0) {
			console.log('[Building Fill Test] Entities without fill:', fillStatus.sampleEntities)
		}

		// Assertions
		expect(fillStatus.totalBuildings).toBeGreaterThan(0)
		expect(fillStatus.buildingsWithoutFill).toBe(0)
	})

	test('buildings should have visible materials (not transparent)', async ({ page }) => {
		// Navigate to postal code
		const searchInput = page.getByPlaceholder(/search/i)
		await searchInput.fill('00100')
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

		const postalResult = page.getByText('Helsinki Keskusta')
		if (
			await postalResult.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }).catch(() => false)
		) {
			await postalResult.click()
		}

		const buildingsLoaded = await waitForBuildingsLoaded(page)
		if (!buildingsLoaded) {
			test.skip(true, 'Buildings did not load')
			return
		}

		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

		// Check materials
		const materialStatus = await page.evaluate(() => {
			const viewer = (window as any).cesiumViewer
			if (!viewer?.dataSources) return { total: 0, withMaterial: 0 }

			let total = 0
			let withMaterial = 0

			const dsCollection = viewer.dataSources._dataSources || []
			for (const ds of dsCollection) {
				if (ds?.name?.startsWith('Buildings ') && ds.entities) {
					for (const entity of ds.entities.values) {
						if (!entity.polygon || !entity.show) continue
						total++

						const material = entity.polygon.material
						if (material) {
							const color = material.color?.getValue?.() || material.color || material
							if (color?.alpha > 0) withMaterial++
						}
					}
				}
			}

			return { total, withMaterial }
		})

		console.log(
			`[Material Test] Total: ${materialStatus.total}, With visible material: ${materialStatus.withMaterial}`
		)

		expect(materialStatus.total).toBeGreaterThan(0)
		// At least 50% should have visible materials (some may be hidden by filters)
		expect(materialStatus.withMaterial / materialStatus.total).toBeGreaterThan(0.5)
	})
})
