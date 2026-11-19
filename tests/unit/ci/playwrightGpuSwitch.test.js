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
import { readFileSync } from 'node:fs'
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

	it('PLAYWRIGHT_GPU=1 under CI also drops --disable-gpu', async () => {
		const args = await launchArgs({ CI: 'true', PLAYWRIGHT_GPU: '1' })
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

/**
 * `just test-e2e-gpu -g "statistical grid to capital region"` must reach
 * Playwright as one -g value. just splices an unquoted `{{ args }}` into the
 * shell line, which splits the value into words: Playwright then greps for the
 * first word and takes the others as path filters, so 6 tests ran instead of 1.
 * With the recipe's `[positional-arguments]` attribute, `"$@"` passes each
 * argument intact. The attribute is per recipe so no other recipe changes how
 * it receives arguments.
 */
describe('just test-e2e-gpu', { tags: ['@unit'] }, () => {
	const justfile = readFileSync('justfile', 'utf8')
	const recipe = justfile.match(/^((?:\[.*\]\n)*)test-e2e-gpu \*args:\n((?:[ \t]+.*\n)+)/m)

	it('passes its arguments to Playwright unsplit', () => {
		expect(recipe, 'test-e2e-gpu recipe not found in justfile').not.toBeNull()
		const [, attributes, body] = recipe
		expect(attributes).toMatch(/^\[positional-arguments\]$/m)
		expect(body).toContain('bun run test:e2e "$@"')
		expect(body).not.toMatch(/\{\{\s*args\s*\}\}/)
	})

	it('runs Playwright with the GPU switch on', () => {
		expect(recipe, 'test-e2e-gpu recipe not found in justfile').not.toBeNull()
		expect(recipe[2]).toMatch(/\bPLAYWRIGHT_GPU=1\b/)
	})
})
