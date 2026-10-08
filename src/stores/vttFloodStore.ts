/**
 * @module stores/vttFloodStore
 * Pinia store coordinating the VTT R4C flood-simulation playback panel.
 *
 * The store owns the playback state (scenario, frame, dimension, opacity), the
 * current frame plus a small LRU cache of recent frames, and the request
 * lifecycle (loading, error, AbortController). The component layer watches
 * store state and calls `vttFlood.renderFlood` / `clearFlood` directly — this
 * mirrors the buildingStore ↔ building/ services separation already used
 * elsewhere in the codebase.
 *
 * Frames are stored compact (typed arrays, one shared mesh) and markRaw, so
 * nothing in them is reactive or captured by Sentry (see
 * utils/sentryStateTransformer.js).
 *
 * setFrame is debounced so scrubbing the slider doesn't burst-fire requests.
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import {
	formatFrameOffset,
	VTT_DEFAULT_DIMENSION,
	VTT_DEFAULT_FRAME,
	VTT_DEFAULT_OPACITY,
	VTT_DIMENSIONS,
	VTT_FRAME_CACHE_SIZE,
	VTT_FRAME_COUNT,
	VTT_OPACITY_MAX,
	VTT_OPACITY_MIN,
	VTT_SCENARIOS,
	validateFrameNumber,
	validateScenarioId,
} from '@/constants/vttFlood'
import { fetchSimulationFrame, internMesh } from '@/services/vttFlood'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import logger from '@/utils/logger'

const FRAME_DEBOUNCE_MS = 200

interface VttMesh {
	cellCount: number
	offsets: Uint32Array
	coords: Float64Array
}

/** Compact frame from services/vttFlood.js compactFrame(). */
interface VttFrameData {
	mesh: VttMesh
	values: Record<string, Float32Array>
	/** Source of the frame, which selects its colour classes. */
	scenarioId?: string
	synthetic?: boolean
}

/** Panel state carried in a shared link (composables/useVttFloodUrlState.js). */
export interface VttFloodUrlState {
	scenarioId?: string
	frameNumber?: number
	dimension?: string
	opacity?: number
}

interface VttFloodState {
	scenarioId: string
	frameNumber: number
	dimension: string
	/** Fill opacity of the flood cells, VTT_OPACITY_MIN..VTT_OPACITY_MAX. */
	opacity: number
	frame: VttFrameData | null
	/** Recently loaded frames by cacheKey(), oldest first. markRaw. */
	_frameCache: Map<string, VttFrameData>
	isLoading: boolean
	error: string | null
	/** Generation counter — incremented for every fetchCurrentFrame call so
	 *  late-resolving responses can detect that they've been superseded. */
	_requestSeq: number
	_abortController: AbortController | null
	_debounceTimer: ReturnType<typeof setTimeout> | null
}

function cacheKey(synthetic: boolean, scenarioId: string, frameNumber: number): string {
	return `${synthetic ? 'synthetic' : 'vtt'}:${scenarioId}:${frameNumber}`
}

/** The mesh of the newest frame held, to share with the next frame. */
function latestMesh(
	current: VttFrameData | null,
	cache: Map<string, VttFrameData>
): VttMesh | null {
	if (current) return current.mesh
	let newest: VttFrameData | null = null
	for (const frame of cache.values()) newest = frame
	return newest?.mesh ?? null
}

/** Insert or refresh a cache entry as most recently used; evict the oldest. */
function rememberFrame(cache: Map<string, VttFrameData>, key: string, frame: VttFrameData): void {
	cache.delete(key)
	cache.set(key, frame)
	while (cache.size > VTT_FRAME_CACHE_SIZE) {
		const oldest = cache.keys().next().value
		if (oldest === undefined) break
		cache.delete(oldest)
	}
}

/** The validated value, or undefined (with a warning) when absent or invalid. */
function validOrUndefined<T>(validate: (value: unknown) => T, value: unknown): T | undefined {
	if (value === undefined) return undefined
	try {
		return validate(value)
	} catch (error) {
		logger.warn('[VTTFloodStore] Ignoring invalid URL state:', (error as Error).message)
		return undefined
	}
}

export const useVttFloodStore = defineStore('vttFlood', {
	state: (): VttFloodState => ({
		scenarioId: VTT_SCENARIOS[0].id,
		frameNumber: VTT_DEFAULT_FRAME,
		dimension: VTT_DEFAULT_DIMENSION,
		opacity: VTT_DEFAULT_OPACITY,
		frame: null,
		_frameCache: markRaw(new Map()),
		isLoading: false,
		error: null,
		_requestSeq: 0,
		_abortController: null,
		_debounceTimer: null,
	}),

	getters: {
		frameOffsetLabel: (state): string => formatFrameOffset(state.frameNumber),
		frameCount: (): number => VTT_FRAME_COUNT,
	},

	actions: {
		selectScenario(id: string): void {
			const safe = validateScenarioId(id)
			if (safe === this.scenarioId) return
			this.scenarioId = safe
			this.frame = null
			// A scrub pending from the old scenario would fetch this frame again.
			if (this._debounceTimer) {
				clearTimeout(this._debounceTimer)
				this._debounceTimer = null
			}
			this.fetchCurrentFrame()
		},

		setFrame(frame: number): void {
			const safe = validateFrameNumber(frame)
			if (safe === this.frameNumber) return
			this.frameNumber = safe
			if (this._debounceTimer) clearTimeout(this._debounceTimer)
			this._debounceTimer = setTimeout(() => {
				this._debounceTimer = null
				this.fetchCurrentFrame()
			}, FRAME_DEBOUNCE_MS)
		},

		setDimension(key: string): void {
			if (!VTT_DIMENSIONS.some((d) => d.key === key)) {
				logger.warn(`[VTTFloodStore] Ignoring unknown dimension "${key}"`)
				return
			}
			this.dimension = key
		},

		setOpacity(value: number): void {
			if (!Number.isFinite(value)) {
				logger.warn(`[VTTFloodStore] Ignoring non-numeric opacity "${String(value)}"`)
				return
			}
			this.opacity = Math.min(VTT_OPACITY_MAX, Math.max(VTT_OPACITY_MIN, value))
		},

		/**
		 * Apply panel state from a shared link without fetching. Called before the
		 * panel opens, so its mount fetch is the only request, for the hydrated
		 * frame. Values are re-validated; an invalid one is skipped with a warning.
		 */
		hydrateFromUrl(state: VttFloodUrlState): void {
			if (this._debounceTimer) {
				clearTimeout(this._debounceTimer)
				this._debounceTimer = null
			}
			const scenarioId = validOrUndefined(validateScenarioId, state.scenarioId)
			if (scenarioId !== undefined) this.scenarioId = scenarioId
			const frameNumber = validOrUndefined(validateFrameNumber, state.frameNumber)
			if (frameNumber !== undefined) this.frameNumber = frameNumber
			if (state.dimension !== undefined) this.setDimension(state.dimension)
			if (state.opacity !== undefined) this.setOpacity(state.opacity)
			this.frame = null
		},

		async fetchCurrentFrame(): Promise<void> {
			// Cancel any in-flight request before starting a new one. The aborted
			// fetch will reject with AbortError, which the catch below swallows.
			if (this._abortController) {
				this._abortController.abort()
				this._abortController = null
			}
			this._requestSeq += 1
			const seq = this._requestSeq
			this.error = null

			const synthetic = useFeatureFlagStore().isEnabled('vttFloodSyntheticData')
			const key = cacheKey(synthetic, this.scenarioId, this.frameNumber)
			const cached = this._frameCache.get(key)
			if (cached) {
				rememberFrame(this._frameCache, key, cached) // mark most recently used
				this.frame = markRaw(cached)
				this.isLoading = false
				return
			}

			const controller = new AbortController()
			this._abortController = controller
			this.isLoading = true
			try {
				const fetched = await fetchSimulationFrame({
					scenarioId: this.scenarioId,
					frameNumber: this.frameNumber,
					signal: controller.signal,
					synthetic,
				})
				if (seq !== this._requestSeq) return // a newer call superseded us
				// markRaw: a frame holds 13k cells; nothing in it should be reactive.
				const result = markRaw(internMesh(fetched, latestMesh(this.frame, this._frameCache)))
				rememberFrame(this._frameCache, key, result)
				this.frame = markRaw(result)
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					logger.debug('[VTTFloodStore] Fetch aborted (newer request started)')
					return
				}
				if (seq !== this._requestSeq) return
				const message = error instanceof Error ? error.message : String(error)
				logger.error('[VTTFloodStore] Failed to fetch frame:', message)
				this.error = message
				this.frame = null
			} finally {
				if (seq === this._requestSeq) {
					this.isLoading = false
					this._abortController = null
				}
			}
		},

		/**
		 * Stop loading and drop the current frame when the panel closes. The frame
		 * cache is kept (bounded by VTT_FRAME_CACHE_SIZE, ~10 MB), so reopening
		 * the panel does not download the ~6 MB frame again.
		 */
		clear(): void {
			if (this._abortController) {
				this._abortController.abort()
				this._abortController = null
			}
			if (this._debounceTimer) {
				clearTimeout(this._debounceTimer)
				this._debounceTimer = null
			}
			this.frame = null
			this.error = null
			this.isLoading = false
		},
	},
})
