/**
 * Adaptive Batch Processing Utility
 *
 * Provides efficient batch processing for large datasets with automatic batch size
 * adjustment to maintain 60fps UI responsiveness. Adapts to device performance
 * and processor workload characteristics.
 *
 * Usage:
 *   import { processBatch, processBatchAdaptive } from '@/utils/batchProcessor.js'
 *
 *   // Adaptive processing (recommended)
 *   await processBatchAdaptive(items, async (item) => {
 *       // Process each item
 *   }, { processorName: 'heatExposure' })
 *
 *   // Legacy fixed-size (backward compatible)
 *   await processBatch(items, (item, index, batch, batchIndex) => {
 *       // Process each item
 *   }, { batchSize: 25, adaptive: false })
 *
 * @module utils/batchProcessor
 */

// Frame budget constants
const FRAME_BUDGET_MS = 16.67 // 60fps target
const MIN_BATCH_SIZE = 5
const MAX_BATCH_SIZE = 100
const INITIAL_BATCH_SIZE = 25
const TARGET_UTILIZATION = 0.5 // Use 50% of frame budget

// In-memory calibration cache
const processorCalibration = new Map()

/**
 * Yields control to the main thread using modern scheduler API, requestIdleCallback, or setTimeout fallback.
 * @returns {Promise<void>} Resolves when browser is ready for next batch.
 */
async function yieldToMain() {
	return new Promise((resolve) => {
		if ('scheduler' in globalThis && 'yield' in globalThis.scheduler) {
			// Modern browsers with Scheduler API (Chrome 115+)
			globalThis.scheduler.yield().then(resolve)
		} else if (typeof requestIdleCallback === 'function') {
			// Fallback to requestIdleCallback
			requestIdleCallback(resolve, { timeout: 50 })
		} else {
			// Final fallback for older browsers
			setTimeout(resolve, 0)
		}
	})
}

/**
 * Gets the initial batch size for a processor from calibration memory or session storage.
 *
 * @param {string} processorName - Name identifying the processor type
 * @returns {number|null} Calibrated batch size or null if not calibrated
 */
function getInitialBatchSize(processorName) {
	// Check memory first
	if (processorCalibration.has(processorName)) {
		return processorCalibration.get(processorName)
	}

	// Check session storage
	try {
		const stored = sessionStorage.getItem(`batchSize_${processorName}`)
		if (stored) {
			const size = parseInt(stored, 10)
			if (!Number.isNaN(size) && size >= MIN_BATCH_SIZE && size <= MAX_BATCH_SIZE) {
				processorCalibration.set(processorName, size)
				return size
			}
		}
	} catch {
		// Storage not available (private browsing, etc.)
	}

	return null
}

/**
 * Updates the calibration data for a processor.
 *
 * @param {string} processorName - Name identifying the processor type
 * @param {number} optimalSize - Optimal batch size determined from processing
 */
function updateCalibration(processorName, optimalSize) {
	const size = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, Math.floor(optimalSize)))
	processorCalibration.set(processorName, size)

	try {
		sessionStorage.setItem(`batchSize_${processorName}`, String(size))
	} catch {
		// Storage not available
	}
}

/**
 * Calculates the next batch size based on processing time.
 * Uses exponential moving average to smooth adjustments.
 *
 * @param {number} currentSize - Current batch size
 * @param {number} elapsedMs - Time taken to process current batch
 * @returns {number} Recommended batch size for next iteration
 */
function calculateNextBatchSize(currentSize, elapsedMs) {
	const targetMs = FRAME_BUDGET_MS * TARGET_UTILIZATION

	if (elapsedMs === 0) {
		// Instant processing - double the batch (capped at MAX)
		return Math.min(currentSize * 2, MAX_BATCH_SIZE)
	}

	const ratio = targetMs / elapsedMs
	let nextSize = Math.floor(currentSize * ratio)

	// Apply bounds
	nextSize = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, nextSize))

	// Smooth changes using exponential moving average (30% old, 70% new)
	return Math.floor(currentSize * 0.3 + nextSize * 0.7)
}

/**
 * Calculates the optimal batch size from processing history.
 * Returns the largest batch size that stayed within the frame budget.
 *
 * @param {Array<{size: number, time: number}>} batchTimes - History of batch sizes and times
 * @returns {number} Optimal batch size for future runs
 */
function calculateOptimalSize(batchTimes) {
	// Find batch sizes that completed within budget
	const withinBudget = batchTimes.filter(
		(b) => b.time < FRAME_BUDGET_MS * TARGET_UTILIZATION && b.time > 0
	)

	if (withinBudget.length === 0) {
		return MIN_BATCH_SIZE
	}

	// Return the largest batch that stayed within budget
	return Math.max(...withinBudget.map((b) => b.size))
}

/**
 * Process items in adaptive batches that maintain 60fps.
 * Automatically adjusts batch size based on measured performance.
 *
 * @param {Array<T>} items - Items to process
 * @param {(item: T) => void | Promise<void>} processor - Function to process each item
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.initialBatchSize=25] - Starting batch size
 * @param {boolean} [options.yieldToMain=true] - Whether to yield between batches
 * @param {(done: number, total: number) => void} [options.onProgress] - Progress callback
 * @param {string} [options.processorName='default'] - Name for calibration persistence
 * @returns {Promise<void>}
 *
 * @example
 * await processBatchAdaptive(entities, async (entity) => {
 *     entity.polygon.material = calculateColor(entity)
 * }, {
 *     processorName: 'heatExposure',
 *     onProgress: (done, total) => {
 *         loadingStore.setProgress('buildings', done / total)
 *     }
 * })
 */
export async function processBatchAdaptive(items, processor, options = {}) {
	const {
		initialBatchSize = INITIAL_BATCH_SIZE,
		yieldToMain: shouldYield = true,
		onProgress = null,
		processorName = 'default',
	} = options

	if (!items?.length) return

	// Get calibrated size or use initial
	let batchSize = getInitialBatchSize(processorName) || initialBatchSize
	let processed = 0
	const total = items.length

	// Performance tracking for calibration
	const batchTimes = []

	while (processed < total) {
		const batchStart = performance.now()

		// Process current batch
		const batchEnd = Math.min(processed + batchSize, total)
		const batch = items.slice(processed, batchEnd)

		await Promise.all(batch.map(processor))

		const elapsed = performance.now() - batchStart

		// Track for calibration (ignore very small batches at the end)
		if (batch.length >= Math.min(batchSize, 5)) {
			batchTimes.push({ size: batch.length, time: elapsed })
		}

		// Calculate next batch size
		batchSize = calculateNextBatchSize(batchSize, elapsed)

		processed = batchEnd

		// Progress callback
		if (onProgress) {
			onProgress(processed, total)
		}

		// Yield to browser between batches (not after the last)
		if (shouldYield && processed < total) {
			await yieldToMain()
		}
	}

	// Update calibration for future runs
	if (batchTimes.length > 3) {
		const avgOptimalSize = calculateOptimalSize(batchTimes)
		updateCalibration(processorName, avgOptimalSize)
	}
}

/**
 * Processes an array of items in batches with optional yielding to main thread.
 * By default uses adaptive sizing; set adaptive: false for fixed-size legacy mode.
 *
 * @param {Array<T>} items - Array of items to process.
 * @param {(item: T, index: number, batch: T[], batchIndex: number) => void | Promise<void>} processor -
 *        Function called for each item. Receives item, absolute index, current batch array, and batch index.
 * @param {Object} [options={}] - Processing options.
 * @param {number | ((itemCount: number) => number)} [options.batchSize=25] -
 *        Number of items per batch, or function that returns batch size based on total item count.
 * @param {boolean} [options.yieldToMain=true] -
 *        Whether to yield control between batches.
 * @param {boolean} [options.adaptive=true] -
 *        Whether to use adaptive batch sizing. Set to false for legacy fixed-size mode.
 * @param {(done: number, total: number) => void} [options.onProgress] - Progress callback (adaptive mode only).
 * @param {string} [options.processorName='default'] - Name for calibration (adaptive mode only).
 * @returns {Promise<void>} Resolves when all items have been processed.
 *
 * @example
 * // Adaptive mode (default)
 * await processBatch(entities, (entity) => {
 *     entity.polygon.material = newMaterial
 * })
 *
 * @example
 * // Legacy fixed-size mode
 * await processBatch(entities, (entity, index, batch, batchIndex) => {
 *     processEntity(entity)
 * }, {
 *     batchSize: 50,
 *     adaptive: false
 * })
 *
 * @example
 * // With dynamic batch size function (legacy mode)
 * await processBatch(entities, (entity) => {
 *     processEntity(entity)
 * }, {
 *     batchSize: (count) => count > 1000 ? 15 : 25,
 *     adaptive: false
 * })
 */
export async function processBatch(items, processor, options = {}) {
	const { yieldToMain: shouldYield = true, adaptive = true } = options
	let { batchSize = INITIAL_BATCH_SIZE } = options

	// Handle empty array
	if (!items || items.length === 0) {
		return
	}

	// Support adaptive batch sizing via function (forces legacy mode)
	const hasDynamicBatchSize = typeof batchSize === 'function'
	if (hasDynamicBatchSize) {
		batchSize = batchSize(items.length)
	}

	// Use adaptive mode by default unless explicitly disabled or using dynamic batch size
	if (adaptive && !hasDynamicBatchSize) {
		// Convert legacy processor signature to simple processor for adaptive mode
		// Legacy: (item, index, batch, batchIndex) => void
		// Adaptive expects: (item) => void | Promise
		// We wrap to provide index context via closure
		let absoluteIndex = 0

		return processBatchAdaptive(
			items,
			async (item) => {
				const result = processor(item, absoluteIndex, [item], Math.floor(absoluteIndex / batchSize))
				absoluteIndex++
				return result
			},
			{
				initialBatchSize: batchSize,
				yieldToMain: shouldYield,
				onProgress: options.onProgress,
				processorName: options.processorName || 'default',
			}
		)
	}

	// Legacy fixed-size implementation
	let batchIndex = 0

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize)

		// Process each item in the batch
		for (let j = 0; j < batch.length; j++) {
			const absoluteIndex = i + j
			await processor(batch[j], absoluteIndex, batch, batchIndex)
		}

		batchIndex++

		// Yield control to browser between batches (but not after the last batch)
		if (shouldYield && i + batchSize < items.length) {
			await yieldToMain()
		}
	}
}

// Export constants for testing
export { MIN_BATCH_SIZE, MAX_BATCH_SIZE, FRAME_BUDGET_MS }

// Export internal functions for testing
export { calculateNextBatchSize, getInitialBatchSize, updateCalibration }

export default processBatch
