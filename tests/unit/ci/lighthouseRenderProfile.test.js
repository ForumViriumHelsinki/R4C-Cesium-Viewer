/**
 * Lighthouse render profile (ADR-011): the pinned WebGL renderer and Cesium
 * frame cap that make CI performance numbers comparable between runs, and the
 * gate (scripts/lighthouse/check-render-profile.mjs) that fails a run which
 * did not use them.
 */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	LIGHTHOUSE_TARGET_FRAME_RATE,
	parseRenderProfileMark,
	renderProfileMark,
} from '@/utils/lighthouseRenderProfile.js'
import { checkRenderProfiles } from '../../../scripts/lighthouse/renderProfilePolicy.mjs'

const require = createRequire(import.meta.url)
const lighthouserc = require(resolve(process.cwd(), 'lighthouserc.cjs'))

const SWIFTSHADER =
	'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)'

/** @param {string[]} marks */
const lhrWithMarks = (marks) => ({
	audits: {
		'user-timings': { details: { items: marks.map((name) => ({ name, timingType: 'Mark' })) } },
	},
})

describe('lighthouserc chromeFlags', { tags: ['@unit'] }, () => {
	const flags = lighthouserc.ci.collect.settings.chromeFlags

	// lhci 0.15 appends ' --headless=new' to chromeFlags with `+=`; an array
	// becomes one comma-joined switch and no flag reaches Chrome.
	it('is a single space-separated string', () => {
		expect(typeof flags).toBe('string')
		expect(flags).not.toContain(',')
	})

	it('forces SwiftShader for WebGL, CPU compositing, and does not disable WebGL', () => {
		const list = flags.split(/\s+/)
		expect(list).toEqual(
			expect.arrayContaining([
				'--use-gl=angle',
				'--use-angle=swiftshader',
				'--enable-unsafe-swiftshader',
				'--disable-gpu-compositing',
			])
		)
		expect(list).not.toContain('--disable-gpu')
	})
})

describe('render-profile mark', { tags: ['@unit'] }, () => {
	it('round-trips fps and the full renderer string', () => {
		expect(parseRenderProfileMark(renderProfileMark(0.5, SWIFTSHADER))).toEqual({
			fps: 0.5,
			renderer: SWIFTSHADER,
		})
	})

	it('ignores unrelated marks', () => {
		expect(parseRenderProfileMark('mark_feature_usage')).toBeNull()
	})
})

describe('checkRenderProfiles', { tags: ['@unit'] }, () => {
	const good = renderProfileMark(LIGHTHOUSE_TARGET_FRAME_RATE, SWIFTSHADER)

	it('passes runs that used SwiftShader at the pinned cap', () => {
		const { problems, profiles } = checkRenderProfiles([
			{ file: 'lhr-1.json', lhr: lhrWithMarks(['other', good]) },
			{ file: 'lhr-2.json', lhr: lhrWithMarks([good]) },
		])
		expect(problems).toEqual([])
		expect(profiles).toHaveLength(2)
	})

	it('fails when there are no runs', () => {
		expect(checkRenderProfiles([]).problems).toHaveLength(1)
	})

	it('fails a run without the mark, as when WebGL is unavailable', () => {
		const { problems } = checkRenderProfiles([{ file: 'lhr-1.json', lhr: lhrWithMarks([]) }])
		expect(problems).toEqual([expect.stringContaining('no render-profile mark')])
	})

	it('fails a run on a hardware renderer', () => {
		const metal = renderProfileMark(
			LIGHTHOUSE_TARGET_FRAME_RATE,
			'ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro)'
		)
		const { problems } = checkRenderProfiles([{ file: 'lhr-1.json', lhr: lhrWithMarks([metal]) }])
		expect(problems).toEqual([expect.stringContaining('expected SwiftShader')])
	})

	it('fails a run with a different frame cap', () => {
		const uncapped = renderProfileMark(60, SWIFTSHADER)
		const { problems } = checkRenderProfiles([
			{ file: 'lhr-1.json', lhr: lhrWithMarks([uncapped]) },
		])
		expect(problems).toEqual([expect.stringContaining('expected 0.5')])
	})
})
