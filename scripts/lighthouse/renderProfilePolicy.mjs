/**
 * Policy behind the Lighthouse render-profile gate (ADR-011): every Lighthouse
 * run must have rendered with SwiftShader at the capped frame rate, or its
 * performance numbers are not comparable with other CI runs.
 */
import {
	LIGHTHOUSE_RENDERER_PATTERN,
	LIGHTHOUSE_TARGET_FRAME_RATE,
	parseRenderProfileMark,
} from '../../src/utils/lighthouseRenderProfile.js'

/**
 * @param {any} lhr - a Lighthouse result (lhr-*.json)
 * @returns {{ fps: number, renderer: string } | null}
 */
export function renderProfileOf(lhr) {
	const items = lhr?.audits?.['user-timings']?.details?.items ?? []
	for (const item of items) {
		const profile = parseRenderProfileMark(String(item.name ?? ''))
		if (profile) return profile
	}
	return null
}

/**
 * @param {Array<{ file: string, lhr: any }>} runs
 * @returns {{ problems: string[], profiles: Array<{ file: string, fps: number, renderer: string }> }}
 */
export function checkRenderProfiles(runs) {
	if (runs.length === 0) {
		return { problems: ['no Lighthouse results (lhr-*.json) found'], profiles: [] }
	}
	const problems = []
	const profiles = []
	for (const { file, lhr } of runs) {
		const profile = renderProfileOf(lhr)
		if (!profile) {
			problems.push(
				`${file}: no render-profile mark. The Cesium viewer never started (WebGL unavailable?) or the build was not made with LIGHTHOUSE=true.`
			)
			continue
		}
		profiles.push({ file, ...profile })
		if (profile.fps !== LIGHTHOUSE_TARGET_FRAME_RATE) {
			problems.push(
				`${file}: Cesium frame cap was ${profile.fps} fps, expected ${LIGHTHOUSE_TARGET_FRAME_RATE}.`
			)
		}
		if (!LIGHTHOUSE_RENDERER_PATTERN.test(profile.renderer)) {
			problems.push(
				`${file}: WebGL renderer was "${profile.renderer}", expected SwiftShader. Check the chromeFlags in lighthouserc.cjs.`
			)
		}
	}
	return { problems, profiles }
}
