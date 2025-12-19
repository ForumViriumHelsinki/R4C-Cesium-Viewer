# Architecture

## Technology Stack

- **Vue 3** with Composition API
- **Vite** for build tooling and development server
- **CesiumJS** for 3D globe and mapping functionality
- **Pinia** for state management
- **Vuetify** for UI components
- **D3.js** for data visualization charts
- **Playwright** for end-to-end testing

## State Management (Pinia Stores)

| Store                    | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `globalStore.js`         | Main application state, view modes, current selections |
| `buildingStore.js`       | Building-specific data and selection                   |
| `toggleStore.js`         | UI toggle states and layer visibility                  |
| `socioEconomicsStore.js` | Socioeconomic data visualization state                 |
| `heatExposureStore.js`   | Heat exposure data and calculations                    |
| `backgroundMapStore.js`  | Background map layer management                        |
| `propsStore.js`          | Property and building attribute data                   |
| `urlStore.js`            | URL state management for deep linking                  |

## Main Pages

| Component           | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `CesiumViewer.vue`  | Core 3D map interface using CesiumJS        |
| `ControlPanel.vue`  | Navigation drawer with filters and controls |
| `Building.vue`      | Building-specific detail view               |
| `Helsinki.vue`      | Helsinki-specific data views                |
| `CapitalRegion.vue` | Capital region overview                     |

## Services Layer

| Service             | Purpose                            |
| ------------------- | ---------------------------------- |
| `datasource.js`     | Data source management for Cesium  |
| `wms.js`            | Web Map Service integration        |
| `featurepicker.js`  | Entity selection and picking       |
| `camera.js`         | Camera controls and positioning    |
| `urbanheat.js`      | Urban heat island data processing  |
| `building.js`       | Building data and 3D visualization |
| `populationgrid.js` | Population grid data handling      |

## Key Features

- Multi-scale visualization (Capital Region → Postal Code → Building)
- Heat exposure analysis and visualization
- Building energy efficiency and tree coverage analysis
- Socioeconomic data overlays
- Time-series data with temporal controls
- 3D building visualization with detailed attributes

## Development Proxy Configuration

Proxy endpoints in development (`vite.config.js`):

| Endpoint         | Target                              |
| ---------------- | ----------------------------------- |
| `/pygeoapi`      | Finland's geo data portal           |
| `/paavo`         | Statistics Finland postal code data |
| `/wms/proxy`     | HSY map services                    |
| `/digitransit`   | Public transport API                |
| `/terrain-proxy` | Helsinki 3D terrain data            |

## Data Sources

Primary data from:

- Helsinki Region Environmental Services (HSY)
- Statistics Finland
- Environmental monitoring systems for climate resilience research
