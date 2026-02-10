/**
 * Mock response data for external API mocking in E2E tests.
 *
 * All fixtures are intentionally minimal — just enough structure
 * for the application to parse without errors.
 */

// 1×1 transparent PNG (67 bytes) — used for all WMS tile responses
// prettier-ignore
export const TRANSPARENT_PNG = Buffer.from([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a, // PNG signature
	0x00,
	0x00,
	0x00,
	0x0d,
	0x49,
	0x48,
	0x44,
	0x52, // IHDR chunk
	0x00,
	0x00,
	0x00,
	0x01,
	0x00,
	0x00,
	0x00,
	0x01, // 1×1
	0x08,
	0x06,
	0x00,
	0x00,
	0x00,
	0x1f,
	0x15,
	0xc4, // RGBA, 8-bit
	0x89,
	0x00,
	0x00,
	0x00,
	0x0a,
	0x49,
	0x44,
	0x41, // IDAT chunk
	0x54,
	0x78,
	0x9c,
	0x62,
	0x00,
	0x00,
	0x00,
	0x02, // compressed data
	0x00,
	0x01,
	0xe5,
	0x27,
	0xde,
	0xfc,
	0x00,
	0x00, // ...
	0x00,
	0x00,
	0x49,
	0x45,
	0x4e,
	0x44,
	0xae,
	0x42, // IEND chunk
	0x60,
	0x82,
])

// Minimal WMS GetCapabilities XML — 3 layers for HSYWMS.vue parsing
export const WMS_CAPABILITIES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0">
  <Service><Name>WMS</Name><Title>Mock WMS</Title></Service>
  <Capability>
    <Layer>
      <Title>Mock Layers</Title>
      <Layer queryable="1"><Name>mock_ortho</Name><Title>Orthoimage 2023</Title></Layer>
      <Layer queryable="1"><Name>mock_landcover</Name><Title>Land Cover</Title></Layer>
      <Layer queryable="1"><Name>mock_buildings</Name><Title>Buildings</Title></Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`

// Minimal layer group hierarchy for BackgroundMapBrowser.vue
export const HSY_LAYER_GROUPS = [
	{
		id: 1,
		name: 'Background Maps',
		layers: [
			{ id: 101, name: 'mock_ortho', title: 'Orthoimage 2023', visible: true },
			{ id: 102, name: 'mock_landcover', title: 'Land Cover', visible: false },
		],
	},
]

// Single postal code feature for socioEconomicsStore.js
export const PAAVO_DATA = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[24.93, 60.17],
						[24.95, 60.17],
						[24.95, 60.19],
						[24.93, 60.19],
						[24.93, 60.17],
					],
				],
			},
			properties: {
				postinumeroalue: '00100',
				nimi: 'Helsinki keskusta - Etu-Töölö',
				he_vakiy: 10000,
				hr_mtu: 35000,
				te_takiy: 5000,
				pt_vakiy: 10000,
			},
		},
	],
}

// Default empty GeoJSON response
export const EMPTY_FEATURE_COLLECTION = {
	type: 'FeatureCollection',
	features: [],
}

// Empty sensor data response for bri3.fvh.io
export const EMPTY_SENSOR_DATA = {
	results: [],
}
