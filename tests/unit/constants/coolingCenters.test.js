import { describe, expect, it } from 'vitest'
import {
	COOLING_CENTER_CAPACITY,
	formatCapacity,
	MAX_COOLING_CENTERS_PER_CELL,
	nextFreeSlot,
} from '@/constants/coolingCenters.js'

describe('cooling center constants', { tags: ['@unit'] }, () => {
	it('keeps the default capacity inside the slider range', () => {
		const { min, max, step, initial } = COOLING_CENTER_CAPACITY
		expect(initial).toBeGreaterThanOrEqual(min)
		expect(initial).toBeLessThanOrEqual(max)
		expect((max - min) % step).toBe(0)
	})

	it('formats capacity with its unit', () => {
		expect(formatCapacity(1000)).toBe('1,000 people')
		expect(formatCapacity(100)).toBe('100 people')
	})
})

describe('nextFreeSlot', { tags: ['@unit'] }, () => {
	const center = (grid_id, slot) => ({ grid_id, slot })

	it('starts at slot 0 in an empty cell', () => {
		expect(nextFreeSlot([center('other', 0)], 'g1')).toBe(0)
	})

	it('reuses the slot of a removed center', () => {
		expect(nextFreeSlot([center('g1', 0), center('g1', 2)], 'g1')).toBe(1)
	})

	it('returns -1 when the cell is full', () => {
		const full = Array.from({ length: MAX_COOLING_CENTERS_PER_CELL }, (_, i) => center('g1', i))
		expect(nextFreeSlot(full, 'g1')).toBe(-1)
	})
})
