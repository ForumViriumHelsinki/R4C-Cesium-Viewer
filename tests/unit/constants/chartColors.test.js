/**
 * Every chart series colour must reach the 3:1 contrast WCAG 1.4.11 asks of
 * graphical objects, on both surfaces it is drawn on: the white plot area
 * (Plot.createSVGElement, both themes) and the dark panel surface behind legend
 * swatches. The focus colour was CSS `orange` (1.97:1 on white) until #1162's
 * review.
 */
import { describe, expect, it } from 'vitest'
import { CHART_SERIES_COLORS } from '@/constants/chartColors.js'

const SURFACES = { 'white plot area': '#ffffff', 'dark panel surface': '#1e1e2e' }
const WCAG_GRAPHICS_MIN = 3

/** Relative luminance of a #rrggbb colour (WCAG 2.x). */
function luminance(hex) {
	const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
	const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi + 0.05) / (lo + 0.05)
}

describe('chart series colours', { tags: ['@unit'] }, () => {
	it('are #rrggbb values, so their contrast can be computed', () => {
		for (const colour of Object.values(CHART_SERIES_COLORS)) {
			expect(colour).toMatch(/^#[0-9a-f]{6}$/i)
		}
	})

	// Control: the measure must reject the colour it replaced.
	it('the contrast measure rejects CSS orange on white', () => {
		expect(contrast('#ffa500', '#ffffff')).toBeLessThan(WCAG_GRAPHICS_MIN)
	})

	for (const [role, colour] of Object.entries(CHART_SERIES_COLORS)) {
		for (const [surface, background] of Object.entries(SURFACES)) {
			it(`${role} reaches 3:1 against the ${surface}`, () => {
				expect(contrast(colour, background)).toBeGreaterThanOrEqual(WCAG_GRAPHICS_MIN)
			})
		}
	}
})
