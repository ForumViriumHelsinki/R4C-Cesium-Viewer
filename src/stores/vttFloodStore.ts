/**
 * @module stores/vttFloodStore
 * Pinia store coordinating the VTT R4C flood-simulation playback panel.
 *
 * The store owns the playback state (scenario, frame, dimension), cached frame
 * data, and request lifecycle (loading, error, AbortController). The
 * component layer watches store state and calls `vttFlood.renderFlood` /
 * `clearFlood` directly — this mirrors the buildingStore ↔ building/ services
 * separation already used elsewhere in the codebase.
 *
 * setFrame is debounced so scrubbing the slider doesn't burst-fire requests.
 */

import { defineStore } from 'pinia'
import {
	formatFrameOffset,
	VTT_DIMENSIONS,
	VTT_FRAME_COUNT,
	VTT_SCENARIOS,
	validateFrameNumber,
	validateScenarioId,
} from '@/constants/vttFlood'
import { fetchSimulationFrame } from '@/services/vttFlood'
import logger from '@/utils/logger'

const FRAME_DEBOUNCE_MS = 200

interface PropertyRange {
	min: number
	max: number
}

interface VttFrameData {
	features: Array<Record<string, unknown>>
	propertyRanges: Record<string, PropertyRange>
}

interface VttFloodState {
	scenarioId: string
	frameNumber: number
	dimension: string
	frame: VttFrameData | null
	isLoading: boolean
	error: string | null
	/** Generation counter — incremented for every fetchCurrentFrame call so
	 *  late-resolving responses can detect that they've been superseded. */
	_requestSeq: number
	_abortController: AbortController | null
	_debounceTimer: ReturnType<typeof setTimeout> | null
}

export const useVttFloodStore = defineStore('vttFlood', {
	state: (): VttFloodState => ({
		scenarioId: VTT_SCENARIOS[0].id,
		frameNumber: 0,
		dimension: VTT_DIMENSIONS[0].key,
		frame: null,
		isLoading: false,
		error: null,
		_requestSeq: 0,
		_abortController: null,
		_debounceTimer: null,
	}),

	getters: {
		activeRange: (state): PropertyRange => {
			if (!state.frame) return { min: 0, max: 0 }
			return state.frame.propertyRanges[state.dimension] || { min: 0, max: 0 }
		},
		frameOffsetLabel: (state): string => formatFrameOffset(state.frameNumber),
		frameCount: (): number => VTT_FRAME_COUNT,
	},

	actions: {
		selectScenario(id: string): void {
			const safe = validateScenarioId(id)
			if (safe === this.scenarioId) return
			this.scenarioId = safe
			this.frame = null
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

		async fetchCurrentFrame(): Promise<void> {
			// Cancel any in-flight request before starting a new one. The aborted
			// fetch will reject with AbortError, which the catch below swallows.
			if (this._abortController) {
				this._abortController.abort()
			}
			const controller = new AbortController()
			this._abortController = controller
			this._requestSeq += 1
			const seq = this._requestSeq

			this.isLoading = true
			this.error = null
			try {
				const result = await fetchSimulationFrame({
					scenarioId: this.scenarioId,
					frameNumber: this.frameNumber,
					signal: controller.signal,
				})
				if (seq !== this._requestSeq) return // a newer call superseded us
				this.frame = result
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
