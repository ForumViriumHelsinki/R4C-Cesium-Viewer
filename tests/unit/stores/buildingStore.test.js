/**
 * @vitest-environment jsdom
 * @tag @unit
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useBuildingStore } from '@/stores/buildingStore';

describe('buildingStore', () => {
	let store;

	beforeEach(() => {
		// Create a new pinia instance for each test
		setActivePinia(createPinia());
		store = useBuildingStore();
		vi.clearAllMocks();
	});

	describe('state initialization', () => {
		it('should initialize with null buildingFeatures', () => {
			expect(store.buildingFeatures).toBeNull();
		});

		it('should initialize with default timeseriesDate', () => {
			expect(store.timeseriesDate).toBe('2023-06-23');
		});

		it('should initialize with empty postalCodeCache', () => {
			expect(store.postalCodeCache).toBeInstanceOf(Map);
			expect(store.postalCodeCache.size).toBe(0);
		});

		it('should initialize with maxPostalCodes set to 10', () => {
			expect(store.maxPostalCodes).toBe(10);
		});
	});

	describe('setBuildingFeatures', () => {
		it('should set features when buildingFeatures is null', () => {
			const features = {
				features: [
					{ id: 'building-1', properties: { name: 'Building 1' } },
					{ id: 'building-2', properties: { name: 'Building 2' } },
				],
			};

			store.setBuildingFeatures(features);

			expect(store.buildingFeatures).toEqual({
				type: 'FeatureCollection',
				features: features.features,
			});
		});

		it('should add postal code to cache when provided', () => {
			const features = {
				features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
			};

			store.setBuildingFeatures(features, '00100');

			expect(store.postalCodeCache.has('00100')).toBe(true);
			expect(store.postalCodeCache.size).toBe(1);
		});

		it('should tag features with postal code when provided', () => {
			const features = {
				features: [
					{ id: 'building-1', properties: { name: 'Building 1' } },
					{ id: 'building-2', properties: {} },
				],
			};

			store.setBuildingFeatures(features, '00100');

			expect(store.buildingFeatures.features[0].properties._cached_postal_code).toBe('00100');
			expect(store.buildingFeatures.features[1].properties._cached_postal_code).toBe('00100');
		});

		it('should not add to cache when postal code is not provided', () => {
			const features = {
				features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
			};

			store.setBuildingFeatures(features);

			expect(store.postalCodeCache.size).toBe(0);
		});

		it('should deduplicate features by ID', () => {
			const features1 = {
				features: [
					{ id: 'building-1', properties: { name: 'Building 1' } },
					{ id: 'building-2', properties: { name: 'Building 2' } },
				],
			};
			const features2 = {
				features: [
					{ id: 'building-2', properties: { name: 'Building 2 Updated' } },
					{ id: 'building-3', properties: { name: 'Building 3' } },
				],
			};

			store.setBuildingFeatures(features1, '00100');
			store.setBuildingFeatures(features2, '00200');

			// Should have 3 unique buildings (1, 2, 3), with building-2 from first call
			expect(store.buildingFeatures.features).toHaveLength(3);
			expect(
				store.buildingFeatures.features.find((f) => f.id === 'building-2').properties.name
			).toBe('Building 2');
		});

		it('should update LRU cache position when postal code is accessed again', () => {
			const features1 = {
				features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
			};
			const _features2 = {
				features: [{ id: 'building-2', properties: { name: 'Building 2' } }],
			};

			store.setBuildingFeatures(features1, '00100');
			const timestamp1 = store.postalCodeCache.get('00100');

			// Wait a bit and access again
			vi.advanceTimersByTime(100);
			store.setBuildingFeatures(features1, '00100');
			const timestamp2 = store.postalCodeCache.get('00100');

			expect(timestamp2).toBeGreaterThan(timestamp1);
		});

		it('should do nothing when features array is empty', () => {
			store.setBuildingFeatures({ features: [] });

			expect(store.buildingFeatures).toBeNull();
		});

		it('should do nothing when features is null', () => {
			store.setBuildingFeatures(null);

			expect(store.buildingFeatures).toBeNull();
		});
	});

	describe('LRU cache eviction', () => {
		it('should evict oldest postal code when cache exceeds maxPostalCodes', () => {
			// Add 11 postal codes (max is 10)
			for (let i = 0; i < 11; i++) {
				const postalCode = `001${i.toString().padStart(2, '0')}`;
				const features = {
					features: [{ id: `building-${i}`, properties: { name: `Building ${i}` } }],
				};
				store.setBuildingFeatures(features, postalCode);
			}

			// Cache should only have 10 entries
			expect(store.postalCodeCache.size).toBe(10);
			// First postal code (00100) should have been evicted
			expect(store.postalCodeCache.has('00100')).toBe(false);
			// Last postal code (00110) should still be in cache
			expect(store.postalCodeCache.has('00110')).toBe(true);
		});

		it('should remove features when postal code is evicted', () => {
			// Add features for postal code 00100
			store.setBuildingFeatures(
				{
					features: [
						{ id: 'building-1', properties: { name: 'Building 1' } },
						{ id: 'building-2', properties: { name: 'Building 2' } },
					],
				},
				'00100'
			);

			const initialCount = store.buildingFeatures.features.length;
			expect(initialCount).toBe(2);

			// Add 10 more postal codes to trigger eviction of 00100
			for (let i = 1; i <= 10; i++) {
				const postalCode = `002${i.toString().padStart(2, '0')}`;
				const features = {
					features: [{ id: `building-${i}`, properties: { name: `Building ${i}` } }],
				};
				store.setBuildingFeatures(features, postalCode);
			}

			// Features from 00100 should have been removed
			const featuresFrom00100 = store.buildingFeatures.features.filter(
				(f) => f.properties._cached_postal_code === '00100'
			);
			expect(featuresFrom00100).toHaveLength(0);
		});

		it('should not evict when under maxPostalCodes limit', () => {
			// Add 5 postal codes (under the limit of 10)
			for (let i = 0; i < 5; i++) {
				const postalCode = `001${i.toString().padStart(2, '0')}`;
				const features = {
					features: [{ id: `building-${i}`, properties: { name: `Building ${i}` } }],
				};
				store.setBuildingFeatures(features, postalCode);
			}

			expect(store.postalCodeCache.size).toBe(5);
			// All postal codes should still be in cache
			expect(store.postalCodeCache.has('00100')).toBe(true);
			expect(store.postalCodeCache.has('00104')).toBe(true);
		});
	});

	describe('evictPostalCode', () => {
		it('should remove all features for a postal code', () => {
			store.setBuildingFeatures(
				{
					features: [
						{ id: 'building-1', properties: { name: 'Building 1' } },
						{ id: 'building-2', properties: { name: 'Building 2' } },
					],
				},
				'00100'
			);
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-3', properties: { name: 'Building 3' } }],
				},
				'00200'
			);

			expect(store.buildingFeatures.features).toHaveLength(3);

			store.evictPostalCode('00100');

			expect(store.buildingFeatures.features).toHaveLength(1);
			expect(store.buildingFeatures.features[0].id).toBe('building-3');
		});

		it('should remove postal code from cache', () => {
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
				},
				'00100'
			);

			expect(store.postalCodeCache.has('00100')).toBe(true);

			store.evictPostalCode('00100');

			expect(store.postalCodeCache.has('00100')).toBe(false);
		});

		it('should do nothing when buildingFeatures is null', () => {
			expect(() => store.evictPostalCode('00100')).not.toThrow();
		});

		it('should do nothing when postal code is not in cache', () => {
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
				},
				'00100'
			);

			const beforeCount = store.buildingFeatures.features.length;
			store.evictPostalCode('00200');
			const afterCount = store.buildingFeatures.features.length;

			expect(afterCount).toBe(beforeCount);
		});
	});

	describe('clearBuildingFeatures', () => {
		it('should clear all building features', () => {
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
				},
				'00100'
			);

			store.clearBuildingFeatures();

			expect(store.buildingFeatures).toBeNull();
		});

		it('should clear postal code cache', () => {
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-1', properties: { name: 'Building 1' } }],
				},
				'00100'
			);
			store.setBuildingFeatures(
				{
					features: [{ id: 'building-2', properties: { name: 'Building 2' } }],
				},
				'00200'
			);

			expect(store.postalCodeCache.size).toBe(2);

			store.clearBuildingFeatures();

			expect(store.postalCodeCache.size).toBe(0);
		});
	});

	describe('settTimeseriesDate', () => {
		it('should update timeseries date', () => {
			store.settTimeseriesDate('2024-07-15');

			expect(store.timeseriesDate).toBe('2024-07-15');
		});
	});

	describe('memory management regression test', () => {
		it('should limit memory growth by evicting old postal codes', () => {
			const featuresPerPostalCode = 200; // Typical number of buildings
			const totalPostalCodes = 50; // User visits 50 postal codes

			// Simulate user browsing many postal codes
			for (let i = 0; i < totalPostalCodes; i++) {
				const postalCode = i.toString().padStart(5, '0');
				const features = {
					features: Array.from({ length: featuresPerPostalCode }, (_, j) => ({
						id: `building-${i}-${j}`,
						properties: { name: `Building ${j}` },
					})),
				};
				store.setBuildingFeatures(features, postalCode);
			}

			// Cache should be limited to maxPostalCodes
			expect(store.postalCodeCache.size).toBe(store.maxPostalCodes);

			// Total features should be approximately maxPostalCodes * featuresPerPostalCode
			const expectedMaxFeatures = store.maxPostalCodes * featuresPerPostalCode;
			expect(store.buildingFeatures.features.length).toBeLessThanOrEqual(expectedMaxFeatures + 10); // Small buffer for edge cases
			expect(store.buildingFeatures.features.length).toBeGreaterThan(
				expectedMaxFeatures - featuresPerPostalCode
			);

			// Verify only the most recent postal codes are in cache
			const lastPostalCode = (totalPostalCodes - 1).toString().padStart(5, '0');
			expect(store.postalCodeCache.has(lastPostalCode)).toBe(true);

			const firstPostalCode = '00000';
			expect(store.postalCodeCache.has(firstPostalCode)).toBe(false);
		});
	});
});
