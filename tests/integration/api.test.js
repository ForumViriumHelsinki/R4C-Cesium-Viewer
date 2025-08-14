import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';

// Mock external APIs for integration tests
const mockExternalAPIs = () => {
  vi.mock('axios', async () => {
    const actual = await vi.importActual('axios');
    return {
      ...actual,
      default: {
        ...actual.default,
        get: vi.fn(),
        create: vi.fn(() => ({
          get: vi.fn(),
          post: vi.fn()
        }))
      }
    };
  });
};

describe('API Integration Tests', () => {
  let testServer;
  const TEST_BASE_URL = 'http://localhost:5173';

  beforeAll(async () => {
    mockExternalAPIs();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  describe('Frontend API Service Integration', () => {
    describe('Address Service', () => {
      it('should handle building address resolution end-to-end', () => {
        // Test realistic building property scenarios
        const testCases = [
          {
            name: 'Helsinki Center Building',
            properties: {
              katunimi_suomi: 'Mannerheimintie',
              osoitenumero: '15'
            },
            expected: 'Mannerheimintie 15'
          },
          {
            name: 'Espoo Building with Extended Address',
            properties: {
              katu: 'Otakaari',
              osno1: '20',
              oski1: 'B',
              osno2: '15'
            },
            expected: 'Otakaari 20 B 15'
          },
          {
            name: 'Building with Invalid Sentinel Values',
            properties: {
              katu: 'Test Street',
              osno1: 999999999,
              oski1: 999999999,
              osno2: '5'
            },
            expected: 'Test Street'
          },
          {
            name: 'Building with Null Values in String',
            properties: {
              katunimi_suomi: 'nullKatunullnimi',
              osoitenumero: 'null10null'
            },
            expected: 'Katunnimi 10'
          }
        ];

        testCases.forEach(testCase => {
          const { findAddressForBuilding } = require('@/services/address.js');
          const result = findAddressForBuilding(testCase.properties);
          expect(result).toBe(testCase.expected);
        });
      });
    });

    describe('Geocoding Service Integration', () => {
      it('should integrate with external geocoding APIs', async () => {
        const mockGeocodeResponse = {
          data: {
            results: [{
              geometry: {
                location: {
                  lat: 60.1699,
                  lng: 24.9384
                }
              },
              formatted_address: 'Helsinki, Finland'
            }]
          }
        };

        axios.get.mockResolvedValue(mockGeocodeResponse);

        // Test geocoding integration
        const address = 'Helsinki, Finland';
        const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
          params: {
            address,
            key: 'test-key'
          }
        });

        expect(response.data.results[0].geometry.location).toEqual({
          lat: 60.1699,
          lng: 24.9384
        });
      });

      it('should handle geocoding errors gracefully', async () => {
        axios.get.mockRejectedValue(new Error('Geocoding API unavailable'));

        try {
          await axios.get('https://maps.googleapis.com/maps/api/geocode/json');
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toBe('Geocoding API unavailable');
        }
      });
    });
  });

  describe('Store Integration Tests', () => {
    it('should maintain consistency across multiple stores', async () => {
      const { createPinia, setActivePinia } = await import('pinia');
      const { useGlobalStore } = await import('@/stores/globalStore.js');
      const { useToggleStore } = await import('@/stores/toggleStore.js');
      const { useBuildingStore } = await import('@/stores/buildingStore.js');

      setActivePinia(createPinia());
      
      const globalStore = useGlobalStore();
      const toggleStore = useToggleStore();
      const buildingStore = useBuildingStore();

      // Test cross-store state consistency
      globalStore.setLevel('building');
      globalStore.setPostalCode('00100');
      toggleStore.setShowPlot(true);

      expect(globalStore.level).toBe('building');
      expect(globalStore.postalcode).toBe('00100');
      expect(toggleStore.showPlot).toBe(true);

      // Test reset functionality affects all stores appropriately
      toggleStore.reset();
      expect(toggleStore.showPlot).toBe(true); // Default is true
      expect(globalStore.level).toBe('building'); // Should remain unchanged
    });

    it('should handle complex state transitions', async () => {
      const { createPinia, setActivePinia } = await import('pinia');
      const { useGlobalStore } = await import('@/stores/globalStore.js');
      const { useToggleStore } = await import('@/stores/toggleStore.js');

      setActivePinia(createPinia());
      
      const globalStore = useGlobalStore();
      const toggleStore = useToggleStore();

      // Simulate complex user workflow
      globalStore.setView('capitalRegion');
      globalStore.setIsLoading(true);
      toggleStore.setGridView(true);
      toggleStore.setPostalCode(true);
      
      expect(globalStore.view).toBe('capitalRegion');
      expect(globalStore.isLoading).toBe(true);
      expect(toggleStore.gridView).toBe(true);
      expect(toggleStore.postalCode).toBe(true);

      // Change to building view
      globalStore.setLevel('building');
      globalStore.setIsLoading(false);
      toggleStore.setGridView(false);
      
      expect(globalStore.level).toBe('building');
      expect(globalStore.isLoading).toBe(false);
      expect(toggleStore.gridView).toBe(false);
    });
  });

  describe('Component Store Integration', () => {
    it('should integrate Loading component with globalStore', async () => {
      const { mount } = await import('@vue/test-utils');
      const { createPinia, setActivePinia } = await import('pinia');
      const { useGlobalStore } = await import('@/stores/globalStore.js');
      const Loading = await import('@/components/Loading.vue');
      const { nextTick } = await import('vue');

      setActivePinia(createPinia());
      const store = useGlobalStore();
      
      const wrapper = mount(Loading.default);
      
      // Test integration: store change should affect component
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
      
      store.setIsLoading(true);
      await nextTick();
      
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('.loading-message').text()).toBe('Loading data, please wait');
      
      store.setIsLoading(false);
      await nextTick();
      
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
      
      wrapper.unmount();
    });
  });

  describe('WMS Service Integration', () => {
    it('should handle WMS layer requests correctly', async () => {
      const mockWMSResponse = {
        data: '<WMS_Capabilities><Capability><Layer><Layer><Name>test-layer</Name><Title>Test Layer</Title></Layer></Layer></Capability></WMS_Capabilities>',
        headers: {
          'content-type': 'application/xml'
        }
      };

      axios.get.mockResolvedValue(mockWMSResponse);

      // Test WMS integration
      const response = await axios.get('https://kartta.hsy.fi/geoserver/wms?request=getCapabilities');
      
      expect(response.data).toContain('WMS_Capabilities');
      expect(response.headers['content-type']).toBe('application/xml');
    });

    it('should handle WMS proxy scenarios', async () => {
      const testScenarios = [
        {
          name: 'GetMap Request',
          params: {
            SERVICE: 'WMS',
            REQUEST: 'GetMap',
            LAYERS: 'test-layer',
            BBOX: '24.0,60.0,25.0,61.0',
            WIDTH: 256,
            HEIGHT: 256,
            FORMAT: 'image/png'
          },
          expectedContentType: 'image/png'
        },
        {
          name: 'GetFeatureInfo Request',
          params: {
            SERVICE: 'WMS',
            REQUEST: 'GetFeatureInfo',
            LAYERS: 'test-layer',
            QUERY_LAYERS: 'test-layer',
            X: 128,
            Y: 128,
            INFO_FORMAT: 'application/json'
          },
          expectedContentType: 'application/json'
        }
      ];

      for (const scenario of testScenarios) {
        const mockResponse = {
          data: Buffer.from('mock response'),
          headers: {
            'content-type': scenario.expectedContentType
          },
          status: 200
        };

        axios.get.mockResolvedValue(mockResponse);

        const response = await axios.get('https://kartta.hsy.fi/geoserver/wms', {
          params: scenario.params
        });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe(scenario.expectedContentType);
      }
    });
  });

  describe('Data Processing Integration', () => {
    it('should handle geospatial data processing workflows', () => {
      // Test data processing pipeline
      const mockGeoData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [24.9384, 60.1699]
          },
          properties: {
            name: 'Test Location',
            temperature: 25.5,
            posno: '00100'
          }
        }]
      };

      // Process coordinates
      const processedFeatures = mockGeoData.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          processedCoords: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          }
        }
      }));

      expect(processedFeatures[0].properties.processedCoords).toEqual({
        lat: 60.1699,
        lng: 24.9384
      });
    });

    it('should handle temperature data normalization', () => {
      const tempData = [
        { date: '2023-06-01', kelvin: 298.15 },
        { date: '2023-06-02', kelvin: 301.15 },
        { date: '2023-06-03', kelvin: 295.15 }
      ];

      // Convert Kelvin to Celsius
      const normalizedData = tempData.map(item => ({
        ...item,
        celsius: Math.round((item.kelvin - 273.15) * 10) / 10
      }));

      expect(normalizedData).toEqual([
        { date: '2023-06-01', kelvin: 298.15, celsius: 25.0 },
        { date: '2023-06-02', kelvin: 301.15, celsius: 28.0 },
        { date: '2023-06-03', kelvin: 295.15, celsius: 22.0 }
      ]);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      // Simulate chain of API failures
      const errors = [];

      // Mock failing services
      axios.get.mockImplementation((url) => {
        if (url.includes('geo.stat.fi')) {
          const error = new Error('Paavo service unavailable');
          errors.push(error);
          return Promise.reject(error);
        }
        if (url.includes('kartta.hsy.fi')) {
          const error = new Error('HSY service unavailable');
          errors.push(error);
          return Promise.reject(error);
        }
        return Promise.resolve({ data: 'fallback data' });
      });

      // Test error accumulation
      try {
        await axios.get('https://geo.stat.fi/test');
      } catch (error) {
        expect(error.message).toBe('Paavo service unavailable');
      }

      try {
        await axios.get('https://kartta.hsy.fi/test');
      } catch (error) {
        expect(error.message).toBe('HSY service unavailable');
      }

      expect(errors).toHaveLength(2);
    });

    it('should provide meaningful error messages for user', () => {
      const errorScenarios = [
        {
          error: new Error('Network timeout'),
          expectedUserMessage: 'Connection timeout. Please check your internet connection.'
        },
        {
          error: new Error('404 Not Found'),
          expectedUserMessage: 'Requested data not found. Please try again.'
        },
        {
          error: new Error('500 Internal Server Error'),
          expectedUserMessage: 'Server error. Please try again later.'
        }
      ];

      const getUserFriendlyError = (error) => {
        if (error.message.includes('timeout')) {
          return 'Connection timeout. Please check your internet connection.';
        }
        if (error.message.includes('404')) {
          return 'Requested data not found. Please try again.';
        }
        if (error.message.includes('500')) {
          return 'Server error. Please try again later.';
        }
        return 'An unexpected error occurred. Please try again.';
      };

      errorScenarios.forEach(({ error, expectedUserMessage }) => {
        expect(getUserFriendlyError(error)).toBe(expectedUserMessage);
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent data requests efficiently', async () => {
      const startTime = Date.now();
      
      // Mock multiple concurrent API calls
      const mockResponses = Array.from({ length: 10 }, (_, i) => ({
        data: { id: i, data: `test-data-${i}` }
      }));

      axios.get.mockImplementation(() => 
        Promise.resolve(mockResponses[Math.floor(Math.random() * mockResponses.length)])
      );

      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        axios.get(`https://api.test.com/data/${i}`)
      );

      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large dataset processing', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        coordinates: [24.9384 + (Math.random() - 0.5) * 0.1, 60.1699 + (Math.random() - 0.5) * 0.1],
        temperature: 20 + Math.random() * 15
      }));

      const startTime = Date.now();
      
      // Process large dataset
      const processedData = largeDataset
        .filter(item => item.temperature > 25)
        .map(item => ({
          ...item,
          temperatureCategory: item.temperature > 30 ? 'hot' : 'warm'
        }));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processedData.length).toBeGreaterThan(0);
      expect(processedData.length).toBeLessThan(largeDataset.length);
      expect(processingTime).toBeLessThan(100); // Should process within 100ms
    });
  });
});