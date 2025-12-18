/**
 * Batch Processing Utility
 *
 * Provides efficient batch processing for large datasets with UI responsiveness.
 * Yields control to the browser between batches to prevent UI blocking.
 *
 * Usage:
 *   import { processBatch } from '@/utils/batchProcessor.js';
 *
 *   await processBatch(items, (item, index, batch, batchIndex) => {
 *       // Process each item
 *   }, { batchSize: 25, yieldToMain: true });
 *
 * @module utils/batchProcessor
 */

/**
 * Yields control to the main thread using requestIdleCallback or setTimeout fallback.
 * @returns {Promise<void>} Resolves when browser is ready for next batch.
 */
const yieldToMainThread = () => {
	return new Promise((resolve) => {
		if (typeof requestIdleCallback !== 'undefined') {
			requestIdleCallback(resolve, { timeout: 50 })
		} else {
			setTimeout(resolve, 0)
		}
	})
}

/**
 * Processes an array of items in batches with optional yielding to main thread.
 *
 * @param {Array<T>} items - Array of items to process.
 * @param {(item: T, index: number, batch: T[], batchIndex: number) => void | Promise<void>} processor -
 *        Function called for each item. Receives item, absolute index, current batch array, and batch index.
 * @param {Object} [options={}] - Processing options.
 * @param {number | ((itemCount: number) => number)} [options.batchSize=25] -
 *        Number of items per batch, or function that returns batch size based on total item count.
 * @param {boolean} [options.yieldToMain=true] -
 *        Whether to yield control between batches. Set to false for faster processing
 *        when UI responsiveness is not a concern.
 * @returns {Promise<void>} Resolves when all items have been processed.
 * @throws {Error} Propagates any error from the processor function.
 *
 * @example
 * // Basic usage
 * await processBatch(entities, (entity) => {
 *     entity.polygon.material = newMaterial;
 * });
 *
 * @example
 * // With adaptive batch size
 * await processBatch(entities, (entity) => {
 *     processEntity(entity);
 * }, {
 *     batchSize: (count) => count > 1000 ? 15 : 25
 * });
 *
 * @example
 * // With async processor
 * await processBatch(items, async (item) => {
 *     await fetchDataForItem(item);
 * }, { batchSize: 10 });
 */
export async function processBatch(items, processor, options = {}) {
	const { yieldToMain = true } = options
	let { batchSize = 25 } = options

	// Handle empty array
	if (!items || items.length === 0) {
		return
	}

	// Support adaptive batch sizing via function
	if (typeof batchSize === 'function') {
		batchSize = batchSize(items.length)
	}

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
		if (yieldToMain && i + batchSize < items.length) {
			await yieldToMainThread()
		}
	}
}

export default processBatch
