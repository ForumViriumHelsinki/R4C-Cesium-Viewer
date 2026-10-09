/**
 * @module utils/softwareRenderer
 *
 * Detects WebGL running on a CPU rasterizer (SwiftShader, llvmpipe, WARP) and
 * caps Cesium's frame rate there. Without a GPU each frame costs roughly a
 * fixed ~140 ms of main-thread time (resolution and MSAA barely change it), so
 * uncapped rendering starves tile and data loading.
 *
 * EXPERIMENT: `?r4cRenderScale=<number>` and `?r4cFps=<number>` override the
 * choices so one build can be measured several ways.
 */

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i

export const SOFTWARE_TARGET_FRAME_RATE = 2

/**
 * @param {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @returns {string}
 */
export function webglRendererName(gl) {
	const ext = gl.getExtension('WEBGL_debug_renderer_info')
	return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '')
}

/** @param {string} renderer */
export const isSoftwareRenderer = (renderer) => SOFTWARE_RENDERER.test(renderer)

/**
 * @param {string} search - location.search
 * @param {string} name
 * @returns {number | undefined} a positive override, if given
 */
const override = (search, name) => {
	const value = Number(new URLSearchParams(search).get(name))
	return value > 0 ? value : undefined
}

/**
 * @param {string} search - location.search
 * @returns {number}
 */
export const chooseResolutionScale = (search) => override(search, 'r4cRenderScale') ?? 1

/**
 * @param {string} renderer
 * @param {string} search - location.search
 * @returns {number | undefined} undefined leaves Cesium uncapped
 */
export const chooseTargetFrameRate = (renderer, search) =>
	override(search, 'r4cFps') ??
	(isSoftwareRenderer(renderer) ? SOFTWARE_TARGET_FRAME_RATE : undefined)
