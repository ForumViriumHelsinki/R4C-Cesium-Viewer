/**
 * @module utils/lighthouseRenderProfile
 *
 * The fixed rendering conditions of the Lighthouse CI build (ADR-011).
 *
 * Lighthouse CI runs on GPU-less runners, where Chrome renders WebGL with
 * SwiftShader on the CPU and each Cesium frame costs ~500 ms of main-thread
 * time. Uncapped, Cesium renders back to back while tiles stream in, so Total
 * Blocking Time measures SwiftShader rather than the app. The Lighthouse build
 * (`LIGHTHOUSE=true bun run build`) therefore caps Cesium's frame rate and
 * records the profile as a User Timing mark, which Lighthouse reports in its
 * `user-timings` audit. `scripts/lighthouse/check-render-profile.mjs` fails
 * the CI run when the mark is missing (no WebGL, so no viewer) or names a
 * different renderer or cap.
 *
 * Production builds never apply this profile.
 */

/** Frames per second Cesium may render in the Lighthouse build. */
export const LIGHTHOUSE_TARGET_FRAME_RATE = 0.5

/** Renderer the Lighthouse runs must use; lighthouserc.cjs forces it. */
export const LIGHTHOUSE_RENDERER_PATTERN = /swiftshader/i

const MARK_PREFIX = 'r4c-lighthouse-render-profile'

/**
 * @param {number} fps
 * @param {string} renderer
 * @returns {string}
 */
export const renderProfileMark = (fps, renderer) => `${MARK_PREFIX} fps=${fps} renderer=${renderer}`

/**
 * @param {string} name - a User Timing mark name
 * @returns {{ fps: number, renderer: string } | null}
 */
export function parseRenderProfileMark(name) {
	const match = new RegExp(`^${MARK_PREFIX} fps=([\\d.]+) renderer=(.*)$`).exec(name)
	return match ? { fps: Number(match[1]), renderer: match[2] } : null
}

/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @returns {string}
 */
export function webglRendererName(gl) {
	const ext = gl.getExtension('WEBGL_debug_renderer_info')
	return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
}

/**
 * Caps the viewer's frame rate and records the profile.
 *
 * @param {{ targetFrameRate: number | undefined, scene: { context: { _gl: WebGLRenderingContext } } }} viewer
 */
export function applyLighthouseRenderProfile(viewer) {
	viewer.targetFrameRate = LIGHTHOUSE_TARGET_FRAME_RATE
	const renderer = webglRendererName(viewer.scene.context._gl)
	performance.mark(renderProfileMark(LIGHTHOUSE_TARGET_FRAME_RATE, renderer))
}
