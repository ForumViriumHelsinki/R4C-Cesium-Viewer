/**
 * Playwright renderer switch (#1148).
 *
 * playwright.config.ts launches every Chromium project with SwiftShader, so a
 * spec that asserts a budget only on a hardware renderer (the grid-to-capital
 * transition in tests/e2e/view-transition-performance.spec.ts) asserts nowhere.
 * PLAYWRIGHT_GPU=1 (`just test-e2e-gpu`) drops the SwiftShader flags and asks
 * headless Chromium for the GPU with --enable-gpu, as `just test-performance`
 * does for the Vitest suite (#843). Without it, local and CI runs keep
 * SwiftShader.
 *
 * The config reads the environment when it is evaluated, so each case stubs
 * the variables and re-imports it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const SWIFTSHADER_FLAGS = ['--use-gl=angle', '--use-angle=swiftshader']

/** @param {Record<string, string | undefined>} env */
async function launchArgs(env) {
	vi.resetModules()
	for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
	const { default: config } = await import('../../../playwright.config.ts')
	return config.use.launchOptions.args
}

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('playwright.config.ts renderer', { tags: ['@unit'] }, () => {
	it('uses SwiftShader by default, locally', async () => {
		const args = await launchArgs({ CI: '', PLAYWRIGHT_GPU: '' })
		expect(args).toEqual(expect.arrayContaining(SWIFTSHADER_FLAGS))
		expect(args).not.toContain('--enable-gpu')
	})

	it('uses SwiftShader by default in CI', async () => {
		const args = await launchArgs({ CI: 'true', PLAYWRIGHT_GPU: '' })
		expect(args).toEqual(expect.arrayContaining([...SWIFTSHADER_FLAGS, '--disable-gpu']))
		expect(args).not.toContain('--enable-gpu')
	})

	it('PLAYWRIGHT_GPU=1 drops the SwiftShader flags and enables the GPU', async () => {
		const args = await launchArgs({ CI: '', PLAYWRIGHT_GPU: '1' })
		expect(args).toContain('--enable-gpu')
		for (const flag of [...SWIFTSHADER_FLAGS, '--disable-gpu']) {
			expect(args).not.toContain(flag)
		}
	})

	it('only the value 1 turns the switch on', async () => {
		const args = await launchArgs({ CI: '', PLAYWRIGHT_GPU: 'true' })
		expect(args).toEqual(expect.arrayContaining(SWIFTSHADER_FLAGS))
		expect(args).not.toContain('--enable-gpu')
	})
})
