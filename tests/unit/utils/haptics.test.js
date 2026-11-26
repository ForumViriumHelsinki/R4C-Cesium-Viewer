import { afterEach, describe, expect, it, vi } from 'vitest'
import { hapticPulse } from '@/utils/haptics.js'

// #1229: Chrome blocks navigator.vibrate before the first user gesture and logs
// an intervention for every blocked call.
describe('hapticPulse', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('does not vibrate before the user has interacted with the page', () => {
		const vibrate = vi.fn()
		vi.stubGlobal('navigator', { vibrate, userActivation: { hasBeenActive: false } })

		expect(hapticPulse([50])).toBe(false)
		expect(vibrate).not.toHaveBeenCalled()
	})

	it('vibrates once the user has interacted with the page', () => {
		const vibrate = vi.fn(() => true)
		vi.stubGlobal('navigator', { vibrate, userActivation: { hasBeenActive: true } })

		expect(hapticPulse([50])).toBe(true)
		expect(vibrate).toHaveBeenCalledWith([50])
	})

	it('does nothing where the Vibration API is missing', () => {
		vi.stubGlobal('navigator', { userActivation: { hasBeenActive: true } })

		expect(hapticPulse([50])).toBe(false)
	})

	it('does not vibrate where user activation cannot be determined', () => {
		const vibrate = vi.fn()
		vi.stubGlobal('navigator', { vibrate })

		expect(hapticPulse([50])).toBe(false)
		expect(vibrate).not.toHaveBeenCalled()
	})
})
