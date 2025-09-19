import { test, expect } from '@playwright/test';

// Mock digitransit API responses for testing
export const digitransitMockResponses = {
  autocomplete: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [24.9384, 60.1699]
        },
        properties: {
          id: 'helsinki:1',
          gid: 'whosonfirst:locality:101748417',
          layer: 'locality',
          source: 'whosonfirst',
          source_id: '101748417',
          name: 'Helsinki',
          confidence: 1,
          match_type: 'exact',
          accuracy: 'centroid',
          country: 'Finland',
          country_gid: 'whosonfirst:country:85633143',
          country_a: 'FIN',
          region: 'Uusimaa',
          region_gid: 'whosonfirst:region:85682067',
          locality: 'Helsinki',
          locality_gid: 'whosonfirst:locality:101748417',
          label: 'Helsinki, Finland'
        }
      }
    ],
    geocoding: {
      version: '0.2',
      attribution: 'Test attribution',
      query: {
        text: 'helsinki',
        size: 10,
        private: false,
        lang: {
          name: 'Finnish',
          iso6391: 'fi',
          iso6393: 'fin',
          defaulted: true
        },
        querySize: 20,
        parser: 'pelias',
        parsed_text: {
          subject: 'helsinki'
        }
      },
      warnings: [],
      engine: {
        name: 'Pelias',
        author: 'Mapzen',
        version: '1.0'
      },
      timestamp: Date.now()
    }
  },
  search: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [24.9384, 60.1699]
        },
        properties: {
          id: 'helsinki:1',
          gid: 'whosonfirst:locality:101748417',
          layer: 'locality',
          source: 'whosonfirst',
          source_id: '101748417',
          name: 'Helsinki',
          confidence: 1,
          match_type: 'exact',
          accuracy: 'centroid',
          country: 'Finland',
          country_gid: 'whosonfirst:country:85633143',
          country_a: 'FIN',
          region: 'Uusimaa',
          region_gid: 'whosonfirst:region:85682067',
          locality: 'Helsinki',
          locality_gid: 'whosonfirst:locality:101748417',
          label: 'Helsinki, Finland'
        }
      }
    ]
  }
};

// Setup digitransit API mocking for all tests
export function setupDigitransitMock() {
  test.beforeEach(async ({ page }) => {
    // Mock all digitransit requests with a single comprehensive handler
    await page.route('**/digitransit/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/geocoding/v1/autocomplete')) {
        const urlObj = new URL(url);
        const searchText = urlObj.searchParams.get('text') || '';
        
        // Create dynamic response based on search text
        const response = {
          ...digitransitMockResponses.autocomplete,
          features: digitransitMockResponses.autocomplete.features.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              label: searchText ? `${searchText}, Finland` : feature.properties.label
            }
          }))
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response)
        });
        
      } else if (url.includes('/geocoding/v1/search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(digitransitMockResponses.search)
        });
        
      } else {
        // For any other digitransit requests, return a basic success response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', timestamp: Date.now() })
        });
      }
    });
  });
}