/**
 * Cooling center placement (CoolingCenter.vue, CoolingCenterOptimiser.vue).
 */

/** A 250 m grid cell holds at most this many manually placed centers. */
export const MAX_COOLING_CENTERS_PER_CELL = 5

/** Capacity slider range, in people. */
export const COOLING_CENTER_CAPACITY = Object.freeze({
	min: 100,
	max: 1000,
	step: 100,
	initial: 1000,
	unit: 'people',
})

/**
 * Marker offsets in metres from the cell centroid, one per slot, so centers
 * sharing a cell do not overlap. Length matches MAX_COOLING_CENTERS_PER_CELL.
 */
export const COOLING_CENTER_SLOT_OFFSETS_M = Object.freeze([
	[0, 0],
	[-100, 80],
	[-100, -80],
	[100, 80],
	[100, -80],
])

const numberFormat = new Intl.NumberFormat('en-US')

/** @param {number} capacity */
export const formatCapacity = (capacity) =>
	`${numberFormat.format(capacity)} ${COOLING_CENTER_CAPACITY.unit}`

/**
 * Lowest marker slot not taken in a cell, so a removed center's slot is reused.
 * @param {Array<{grid_id?: string|number, slot?: number}>} centers
 * @param {string|number} gridId
 * @returns {number} slot index, or -1 when the cell is full
 */
export const nextFreeSlot = (centers, gridId) => {
	const taken = new Set(centers.filter((c) => c.grid_id === gridId).map((c) => c.slot))
	for (let slot = 0; slot < MAX_COOLING_CENTERS_PER_CELL; slot++) {
		if (!taken.has(slot)) return slot
	}
	return -1
}
