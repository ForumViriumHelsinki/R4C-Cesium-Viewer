# Heat Exposure Analysis & Visualization PRD

## Executive Summary

### Problem Statement

Climate change is intensifying urban heat island effects, creating significant public health risks and reducing quality of life in densely populated areas. Urban planners, researchers, and policymakers need comprehensive tools to:

- Understand spatial distribution of heat exposure across urban areas
- Analyze temporal heat patterns and identify trends over time (2015-2025)
- Assess heat vulnerability at multiple scales (regional, postal code, building-level)
- Identify high-risk areas requiring climate adaptation interventions
- Evaluate building-specific heat exposure for targeted mitigation strategies

### Proposed Solution

A multi-scale heat exposure analysis and visualization system that integrates temporal satellite-derived surface temperature data with building-level geometry and postal code aggregations. The system provides:

- **Temporal Heat Data Selection**: Interactive timeline slider for exploring 10 years of heat exposure data (2015-2025)
- **Multi-Scale Analysis**: Seamless navigation from Capital Region overview to postal code aggregations to individual building analysis
- **Distribution Visualization**: D3.js-powered heat histogram showing exposure distribution with interactive building highlighting
- **Data Normalization**: Intelligent heat index normalization using date-specific Kelvin min/max values for accurate temperature representation
- **Building Integration**: Automated matching of heat exposure data with building geometry and attributes

### Business Impact

**Primary Benefits:**

- **Climate Resilience Planning**: Enable data-driven identification of heat-vulnerable neighborhoods requiring intervention
- **Public Health Protection**: Support health authorities in targeting cooling resources to high-exposure areas
- **Research Enablement**: Provide researchers with comprehensive temporal heat data for climate adaptation studies
- **Urban Planning Support**: Inform building design standards and urban greening initiatives

**Quantifiable Outcomes:**

- 10-year temporal coverage (2015-2025) with annual summer heat measurements
- Building-level resolution for 100,000+ buildings across Capital Region
- Postal code aggregations for 200+ zones enabling regional comparisons
- Sub-second histogram updates for interactive exploration

## Stakeholders & Personas

### Primary Stakeholders

**Accountable:**

- Climate Adaptation Research Team - Overall feature ownership and validation
- Urban Planning Department (HSY) - Domain expertise and data source management

**Responsible:**

- Frontend Engineering Team - Implementation of visualization and state management
- Data Engineering Team - Pygeoapi integration and data pipeline optimization
- UX/UI Team - Interaction design and accessibility compliance

### Secondary Stakeholders

**Consulted:**

- Public Health Authorities - Heat exposure thresholds and health risk interpretation
- Environmental Researchers - Scientific validation of calculation methods
- Urban Planners - Use case validation and workflow integration

**Informed:**

- End Users (Researchers, Planners) - Feature availability and training
- Support Team - Troubleshooting and user assistance
- Product Management - Feature adoption and usage metrics

### User Personas

#### Persona 1: Climate Researcher

**Profile:**

- PhD-level environmental scientist studying urban heat island effects
- Needs to analyze temporal heat patterns for peer-reviewed publications
- Requires exportable data and reproducible analysis methods

**Needs:**

- Access to historical heat data (2015-2025) with temporal continuity
- Building-level resolution for micro-scale heat analysis
- Ability to filter buildings by construction date to analyze heat evolution
- Statistical distribution visualization to identify outliers and patterns

**Pain Points:**

- Existing tools lack temporal depth or building-level resolution
- Manual data integration from multiple sources is time-consuming
- Limited visualization options for communicating research findings

#### Persona 2: Urban Planner

**Profile:**

- Municipal planning authority focused on climate adaptation strategies
- Develops cooling interventions (tree planting, cool roofs, urban greening)
- Works with neighborhood-scale analysis (postal code level)

**Needs:**

- Quick identification of high-heat neighborhoods requiring intervention
- Comparison of heat exposure across postal codes to prioritize resources
- Integration with building attributes (age, purpose, height) for targeted strategies
- Temporal trends to validate effectiveness of past interventions

**Pain Points:**

- Scattered data sources make comprehensive analysis difficult
- Lack of interactive tools for exploring heat distribution
- Difficulty communicating heat risk to non-technical stakeholders

#### Persona 3: Public Health Analyst

**Profile:**

- Health department analyst studying heat-related health outcomes
- Correlates heat exposure with emergency room visits and mortality
- Needs to identify vulnerable populations in high-exposure areas

**Needs:**

- Current and historical heat exposure data at neighborhood scale
- Ability to identify extreme heat exposure buildings for outreach
- Integration with demographic data (future capability)
- Visual communication tools for public awareness campaigns

**Pain Points:**

- Real-time heat monitoring tools lack historical context
- Building-level data needed but not accessible in existing systems
- Visual tools for non-technical audiences are lacking

### Stakeholder Matrix (RACI)

| Activity                         | Climate Team | Engineering | UX/UI | Public Health | Planners |
| -------------------------------- | ------------ | ----------- | ----- | ------------- | -------- |
| Requirements Definition          | A            | C           | C     | C             | C        |
| Data Pipeline Development        | C            | R/A         | I     | I             | I        |
| UI/UX Design                     | C            | C           | R/A   | C             | C        |
| Implementation                   | I            | R/A         | C     | I             | I        |
| Heat Calculation Validation      | R/A          | C           | I     | C             | I        |
| User Acceptance Testing          | A            | C           | C     | R             | R        |
| Documentation & Training         | C            | C           | R     | I             | I        |
| Production Deployment            | I            | R/A         | I     | I             | I        |
| Performance Monitoring           | C            | R/A         | I     | I             | I        |
| Feature Iteration & Enhancements | A            | R           | R     | C             | C        |

### User Stories & Acceptance Criteria

#### Epic 1: Temporal Heat Data Selection

**User Story 1.1: Select Heat Data Date**

As a climate researcher, I want to select different heat data dates from a timeline slider so that I can analyze temporal heat patterns across multiple years.

**Acceptance Criteria:**

- Timeline component displays 10 available heat dates (2015-2025)
- Current selection is visually highlighted with active state
- Date selection triggers immediate map and histogram updates
- Selected date persists in URL for shareable links
- Timeline shows abbreviated date labels (e.g., "Jul '22") for readability
- Mobile-responsive timeline fits on small screens
- Keyboard navigation supported (arrow keys to change date)
- Screen reader announces date changes

**User Story 1.2: Understand Temporal Coverage**

As an urban planner, I want to see which years have heat data available so that I can understand the temporal coverage before analysis.

**Acceptance Criteria:**

- Timeline displays all 10 available dates clearly
- Dates are chronologically ordered from 2015 to 2025
- Tooltip or info icon explains data source (Landsat surface temperature)
- Default date is 2022-06-28 (mid-range, good quality data)
- Timeline card shows "Heat Timeline" title with clock icon
- Info text explains slider functionality

#### Epic 2: Building-Level Heat Exposure

**User Story 2.1: View Building Heat Exposure**

As a public health analyst, I want to see heat exposure values for individual buildings so that I can identify structures with highest heat vulnerability.

**Acceptance Criteria:**

- Buildings color-coded by heat exposure using warm color gradient (orange to red)
- Color intensity correlates with exposure level (0-1 normalized index or Celsius)
- Building tooltips display actual temperature or heat index on hover
- Building selection highlights entity with outline effect
- Heat exposure data matches selected timeline date
- Missing heat data buildings rendered with neutral color or pattern
- 3D building height visualization maintained with heat colors

**User Story 2.2: Filter Buildings by Construction Date**

As a researcher, I want heat timeseries filtered by building construction date so that I only see heat data from years when the building existed.

**Acceptance Criteria:**

- Heat timeseries filtered to exclude dates before construction year (kavu field)
- Filter only applies to buildings constructed after 2015
- Buildings constructed before 2015 show all available heat data
- Filter happens automatically during data processing (no user action needed)
- Filter logic documented in code comments and PRD
- No visual errors or data gaps when switching dates

#### Epic 3: Postal Code Heat Aggregation

**User Story 3.1: View Postal Code Heat Statistics**

As an urban planner, I want to see average heat exposure for postal code areas so that I can compare neighborhoods and prioritize interventions.

**Acceptance Criteria:**

- Average heat exposure calculated for each postal code
- Postal code entities color-coded by average heat exposure
- Average excludes buildings with missing heat data (no zero-inflation)
- Postal code selection zooms to area and shows building-level data
- Average heat exposure value displayed in control panel
- Calculation excludes orphan heat polygons (unmatched buildings)

**User Story 3.2: Compare Postal Codes**

As a climate researcher, I want to compare heat exposure across postal codes so that I can identify regional heat patterns.

**Acceptance Criteria:**

- Consistent color scale across all postal codes (date-specific min/max normalization)
- Color scale legend visible in UI
- Postal code boundaries clearly delineated
- Hover shows postal code name and average heat exposure
- Smooth transitions when switching between temporal dates
- Color scale adjusts automatically for cold date (2021-02-18 uses blue gradient)

#### Epic 4: Heat Distribution Visualization

**User Story 4.1: Explore Heat Histogram**

As any user, I want to see a histogram of building heat exposure distribution so that I can understand the spread and identify outliers.

**Acceptance Criteria:**

- D3.js histogram with 20 bins showing building count per heat range
- X-axis shows heat exposure index (0-1) or temperature in Celsius
- Y-axis shows building count per bin
- Bars color-coded matching map heat colors (warm gradient)
- Histogram updates immediately when timeline date changes
- Title indicates postal code name and selected date
- Link to Landsat Collection 2 Surface Temperature documentation
- Histogram only visible at postal code level (hidden at region/building levels)

**User Story 4.2: Highlight Buildings from Histogram**

As a researcher, I want to click histogram bars to highlight corresponding buildings on the map so that I can spatially locate high-heat buildings.

**Acceptance Criteria:**

- Click on histogram bar highlights all buildings in that heat range
- Buildings highlighted with visible outline or increased opacity
- Tooltip on bar shows exact heat range and building count
- Tooltip includes hint: "Left click highlights the building(s) on map"
- Multiple buildings in range can be selected simultaneously
- Highlight clears when clicking different bar or map area
- Smooth camera zoom to highlighted buildings
- Highlighted buildings maintain heat color coding

#### Epic 5: Data Integration & Performance

**User Story 5.1: Seamless Building-Heat Matching**

As a system, I need to match building geometry from Helsinki WFS with heat exposure data from pygeoapi so that users see integrated building-level heat information.

**Acceptance Criteria:**

- Building matching by Helsinki building ID (properties.id == hki_id)
- Heat attributes added to building properties during data load
- Matched buildings removed from heat dataset to identify orphans
- Orphan heat polygons (unmatched) appended to visualization
- Batch processing (25 buildings per batch) prevents UI blocking
- requestIdleCallback yields control for UI responsiveness
- Matching completes within 3 seconds for typical postal code (500 buildings)
- Console logging indicates processing start and completion

**User Story 5.2: Handle Large Datasets Efficiently**

As a user, I want smooth performance when analyzing postal codes with thousands of buildings so that I can work without lag or freezing.

**Acceptance Criteria:**

- Batched entity processing (25 entities per batch) for all operations
- Histogram generation completes within 1 second for 5000 buildings
- Timeline date changes update map within 2 seconds
- No UI blocking during data processing (requestIdleCallback used)
- Browser remains responsive during heat calculation
- Loading indicators shown during long operations
- Lazy data loading (only fetch when postal code selected)

## Functional Requirements

### Core Functionality

#### FR1: Temporal Heat Data Management

**FR1.1 Heat Date Selection**

- Timeline slider with 10 discrete date positions (2015-2025)
- Default date: 2022-06-28
- Available dates:
  - 2015-07-03
  - 2016-06-03
  - 2018-07-27
  - 2019-06-05
  - 2020-06-23
  - 2021-07-12
  - 2022-06-28
  - 2023-06-23
  - 2024-06-26
  - 2025-07-14
- Global state synchronization via `globalStore.heatDataDate`
- URL persistence for shareable links

**FR1.2 Date-Specific Temperature Normalization**

- Min/max Kelvin values stored per date in globalStore:
  ```javascript
  minMaxKelvin: {
    '2015-07-03': { min: 285.7481384277, max: 323.753112793 },
    '2016-06-03': { min: 273.0023498535, max: 326.4089050293 },
    '2018-07-27': { min: 280.1904296875, max: 322.5089416504 },
    '2019-06-05': { min: 284.0459594727, max: 323.6129760742 },
    '2020-06-23': { min: 291.6373901367, max: 325.2809753418 },
    '2021-07-12': { min: 285.3448181152, max: 329.929473877 },
    '2022-06-28': { min: 291.5040893555, max: 332.274230957 },
    '2023-06-23': { min: 288.9166564941, max: 324.6862182617 },
    '2024-06-26': { min: 284.6065368652, max: 323.5138549805 },
    '2025-07-14': { min: 284.924407958, max: 328.2204589844 }
  }
  ```
- Normalization formula: `index = (temp_K - min_K) / (max_K - min_K)`
- Denormalization for display: `temp_C = (index * (max_K - min_K) + min_K) - 273.15`

**FR1.3 Heat Timeseries Filtering**

- Filter timeseries by building construction date (`kavu` property)
- Only filter buildings constructed after 2015
- Filter removes heat data from dates before construction year
- Implementation in `urbanheat.js::filterHeatTimeseries()`

#### FR2: Multi-Scale Heat Exposure

**FR2.1 Capital Region Level**

- Postal code polygons color-coded by average building heat exposure
- Average calculated from all buildings within postal code boundary
- Empty postal codes (no buildings) show no heat data
- Postal code heat exposure fetched from `heatexposure_optimized` collection

**FR2.2 Postal Code Level**

- Individual buildings color-coded by heat exposure value
- Buildings fetched from Helsinki WFS or HSY buildings collection
- Heat exposure data fetched from `urban_heat_building` collection (Helsinki)
- Building-heat matching by `hki_id` field
- Average heat exposure calculated and displayed in UI
- Heat histogram displayed in control panel
- Timeline component visible for date selection

**FR2.3 Building Level**

- Selected building highlighted with outline effect
- Building detail panel shows heat exposure value
- Heat exposure for selected date from timeline
- Building attributes (purpose, height, construction year) displayed
- Tree coverage and roof attributes integrated

#### FR3: Heat Exposure Calculations

**FR3.1 Average Postal Code Heat Exposure**

- Formula: `average = sum(building_heat_values) / count(buildings_with_data)`
- Excludes buildings with null/undefined heat exposure
- Separate calculation paths for Helsinki vs Capital Region:
  - Helsinki: Uses `avgheatexposuretobuilding` property
  - Capital Region: Extracts from `heat_timeseries` array for selected date
- Implementation in `urbanheat.js::calculateAverageExposure()`

**FR3.2 Heat Histogram Data Generation**

- Collects all building heat exposure values in postal code
- Creates array of numeric heat values for D3.js histogram
- Stores in `propsStore.heatHistogramData`
- Updates when timeline date changes

**FR3.3 Heat Color Calculation**

- Warm dates (all except 2021-02-18):
  - Red-orange gradient: `rgba(255, g, 0, alpha)`
  - Green component: `g = 255 - (index * 255)`
  - Alpha: `alpha = index`
- Cold date (2021-02-18):
  - Blue-green gradient: `rgba(0, g, 255, alpha)`
  - Green component: `g = 255 - (255 - index * 255)`
  - Alpha: `alpha = 1 - index`
- Implementation in `HeatHistogram.vue::rgbColor()`

#### FR4: Heat Distribution Visualization

**FR4.1 D3.js Heat Histogram**

- Container: `#heatHistogramContainer` div (220px height)
- SVG dimensions:
  - Width: `navbarWidth - margins` (responsive)
  - Height: 250px - margins
  - Margins: `{top: 30, right: 50, bottom: 34, left: 30}`
- 20 bins calculated by D3 histogram with automatic domain
- X-axis: Heat exposure index or temperature (Celsius)
- Y-axis: Building count per bin
- Interactive tooltips on bar hover
- Click handler for building highlighting

**FR4.2 Histogram Lifecycle**

- Created when entering postal code level (`store.level === 'postalCode'`)
- Cleared when leaving postal code level
- Recreated on timeline date change via `eventBus::newHeatHistogram`
- Auto-updates when heat histogram data changes

**FR4.3 Interactive Features**

- Hover tooltip shows:
  - Heat range: "Heat exposure index: 0.45" or "Temperature in Celsius: 25.3"
  - Building count: "Amount of buildings: 127"
  - Click hint: "Left click highlights the building(s) on map"
- Click triggers `buildingService.highlightBuildingsInViewer(d)`
- Buildings in selected heat range highlighted on map
- Camera zooms to highlighted buildings

#### FR5: Timeline Component

**FR5.1 UI Elements**

- Fixed position overlay: bottom-left (24px from edges)
- Card design with glassmorphism: `rgba(255, 255, 255, 0.95)` + backdrop blur
- Timeline header:
  - Title: "Heat Timeline" with clock icon
  - Selected date chip (primary color, tonal variant)
- Date labels row showing all 10 dates
- Vuetify slider (v-slider) with 10 positions (0-9 index)
- Info text: "Use the slider to explore heat data across different time periods"

**FR5.2 Slider Behavior**

- Model: `currentPropertyIndex` (0-9 integer)
- Max: 9 (timelineLength - 1)
- Step: 1 (discrete positions)
- Tick marks shown for all positions
- Thumb color matches primary theme
- Track color: grey-lighten-3

**FR5.3 Date Formatting**

- Display format: "Jul '22" (short month + 2-digit year)
- Full date stored as ISO string: "2022-06-28"
- Active date label highlighted with primary color + bold weight
- Inactive labels use secondary text color (60% opacity)

**FR5.4 Responsiveness**

- Desktop: 400-500px width, 24px bottom/left margins
- Mobile: Full width minus 16px margins, reduced padding
- Font sizes scale down on mobile (13px title, 0.7rem labels)
- High contrast mode: White background + 2px black border

#### FR6: Data Integration

**FR6.1 Building-Heat Attribute Matching**

- Match algorithm:
  1. Iterate through WFS buildings
  2. For each building, find matching heat feature by ID
  3. Copy heat attributes to building properties
  4. Remove matched heat feature from array (track orphans)
  5. Continue until all buildings processed
- Batch size: 25 buildings per batch
- UI yield: requestIdleCallback between batches
- Console logging: Start and completion messages

**FR6.2 Heat Attributes Added to Buildings**

- `avgheatexposuretobuilding`: Average heat exposure index (0-1) or temperature (Celsius)
- `distanceToUnder40`: Distance to nearest cooling zone (<40°C area)
- `locationUnder40`: Boolean indicating if building in cooling zone
- `year_of_construction`: Building construction year
- `measured_height`: Actual building height (meters)
- `roof_type`: Roof structure type
- `area_m2`: Building footprint area (square meters)
- `roof_median_color`: Median roof color (decoded from value)
- `roof_mode_color`: Modal roof color (decoded from value)

**FR6.3 Orphan Heat Data Handling**

- Heat features without matching building ID collected separately
- Orphans appended to building features array for visualization
- Orphans visualized as polygons (no height extrusion)
- Orphans included in heat histogram calculation
- Function: `addMissingHeatData(features, heat)`

**FR6.4 Data Sources & Endpoints**

- Postal code heat exposure: `/pygeoapi/collections/heatexposure_optimized/items`
- Building heat data (Helsinki): `/pygeoapi/collections/urban_heat_building/items?postinumero={code}`
- Building geometry (Helsinki): Helsinki WFS (kartta.hel.fi)
- Building geometry (Capital Region): `/pygeoapi/collections/hsy_buildings_optimized/items?postinumero={code}`

## Non-Functional Requirements

### Performance Requirements

**NFR1: Response Time**

- Timeline date change: Map update within 2 seconds
- Histogram generation: Complete within 1 second for 5000 buildings
- Building-heat matching: Complete within 3 seconds for 500 buildings
- Postal code heat data fetch: Complete within 2 seconds
- Building data fetch: Complete within 5 seconds for 10,000 buildings

**NFR2: UI Responsiveness**

- No UI blocking during data processing (requestIdleCallback used)
- Smooth slider interactions (no lag or stuttering)
- Histogram hover tooltips appear within 100ms
- Building highlighting completes within 500ms
- Camera animations smooth (60fps target)

**NFR3: Scalability**

- Support postal codes with up to 10,000 buildings
- Handle 200+ postal codes in Capital Region view
- Maintain performance with 10 years of temporal data
- Histogram rendering optimized for 5000+ data points
- Batched processing prevents memory issues

### Security Requirements

**NFR4: Data Access**

- All API requests proxied through application backend
- No direct client access to pygeoapi or HSY services
- CORS handled by proxy configuration
- No sensitive data stored in client localStorage
- URL state sanitized to prevent injection

**NFR5: Data Integrity**

- Heat exposure values validated as numeric (0-1 range or Celsius)
- Date strings validated against known date list
- Building ID matching uses exact string comparison
- Null/undefined heat values excluded from calculations
- Min/max Kelvin values hardcoded (prevent tampering)

### Accessibility Requirements

**NFR6: WCAG 2.1 AA Compliance**

- Timeline slider keyboard navigable (arrow keys)
- Screen reader announces date changes
- Color contrast ratios meet AA standards (4.5:1 minimum)
- Focus indicators visible on all interactive elements
- Alternative text for timeline icons
- High contrast mode support (media query)

**NFR7: Responsive Design**

- Timeline adapts to mobile screens (320px minimum width)
- Histogram responsive to navbar width changes
- Touch targets minimum 44x44px on mobile
- Readable font sizes on all screen sizes (16px minimum body text)
- Landscape orientation supported

### Usability Requirements

**NFR8: User Experience**

- Timeline interaction intuitive (slider = familiar pattern)
- Date labels human-readable (not ISO dates)
- Active date visually distinct
- Histogram tooltips informative and concise
- Color gradients intuitive (warm colors = heat)
- Loading states communicate progress

**NFR9: Error Handling**

- Missing heat data handled gracefully (neutral color)
- Failed API requests show error message
- Partial data loads allow continued use
- Console errors descriptive for debugging
- Fallback to default date if invalid URL state

### Compatibility Requirements

**NFR10: Browser Support**

- Modern browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- CesiumJS WebGL requirements met
- D3.js v7+ compatible
- Vue 3 composition API supported
- No IE11 support required

**NFR11: Device Support**

- Desktop: Windows, macOS, Linux
- Mobile: iOS 14+, Android 10+
- Tablet: iPad, Android tablets
- Touch and mouse input supported
- Minimum screen resolution: 320x568px

## Technical Considerations

### Architecture Implications

**TC1: State Management**

- Global state (Pinia stores):
  - `globalStore`: Current date, min/max Kelvin, navigation level, average heat exposure
  - `propsStore`: Heat histogram data, scatter plot data
  - `heatExposureStore`: Postal code heat aggregates
  - `buildingStore`: Building features with heat attributes
- Derived state computed on-demand (getters)
- State mutations via actions only (strict mode)
- No direct state manipulation in components

**TC2: Component Architecture**

- Timeline component: Self-contained, emits events for state changes
- HeatHistogram component: Reactive to propsStore changes, eventBus integration
- Building service: Stateless service class for heat calculations
- Urbanheat service: Handles data fetching and matching logic
- Plot service: Reusable D3.js utilities for charts

**TC3: Data Flow**

1. User selects postal code → Building geometry fetched from WFS/pygeoapi
2. Building data triggers heat data fetch from `urban_heat_building` endpoint
3. `urbanheat.js` matches buildings with heat data by ID
4. Matched attributes added to building properties
5. Buildings rendered with heat colors via `building.js::setBuildingEntityPolygon()`
6. Heat histogram data calculated and stored in `propsStore`
7. HeatHistogram component renders D3.js chart
8. Timeline changes trigger recalculation of heat colors and histogram

### Dependencies

**TD1: Core Libraries**

- Vue 3.4+: Composition API, reactive system
- Pinia 2.1+: State management
- CesiumJS 1.110+: 3D globe and entity rendering
- D3.js 7.8+: Histogram and data visualization
- Vuetify 3.4+: UI components (slider, chips, icons)

**TD2: Services & APIs**

- Pygeoapi: Heat exposure data, building geometry
- Helsinki WFS: Building geometry (Helsinki only)
- HSY services: Capital Region building data
- Landsat Collection 2: Satellite surface temperature imagery (data source)

**TD3: Internal Dependencies**

- `datasource.js`: Cesium data source management
- `building.js`: Building entity styling and interactions
- `urbanheat.js`: Heat data integration
- `plot.js`: D3.js chart utilities
- `eventEmitter.js`: Cross-component event bus
- `cesiumEntityManager.js`: Non-reactive entity registry

### Integration Points

**IP1: URL State Management**

- Timeline selection persists in URL query parameters
- Deep linking supported: `?heatDate=2022-06-28`
- URL updated on date change (browser history)
- Initial state loaded from URL on page load
- URL validation prevents invalid dates

**IP2: Cross-Component Events**

- `newHeatHistogram`: Emitted when heat data changes → HeatHistogram rerenders
- `updateScatterPlot`: Emitted when date changes → Scatter plot updates
- `showHelsinki`/`showCapitalRegion`: Control plot visibility by region
- `hideBuilding`: Hide building-level plots

**IP3: CesiumJS Integration**

- Building entities created via Datasource service
- Heat colors applied to `entity.polygon.material.color`
- Building selection managed by CesiumEntityManager
- Entity properties stored in `entity.properties` (GeoJSON attributes)
- Camera positioning triggered by postal code selection

### Data Models

**DM1: Building Feature (GeoJSON)**

```json
{
  "type": "Feature",
  "id": "HKI_12345",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[25.01, 60.17], [25.02, 60.17], ...]]
  },
  "properties": {
    "id": "HKI_12345",
    "avgheatexposuretobuilding": 0.67,
    "heat_timeseries": [
      {"date": "2022-06-28", "avgheatexposure": 0.67},
      {"date": "2023-06-23", "avgheatexposure": 0.71}
    ],
    "kavu": 2018,
    "measured_height": 15.3,
    "area_m2": 450.5,
    "c_kayttark": "011",
    "kayttotarkoitus": "Residential",
    "distanceToUnder40": 125.7,
    "locationUnder40": false
  }
}
```

**DM2: Postal Code Heat Exposure (GeoJSON)**

```json
{
  "type": "Feature",
  "id": "00100",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[24.95, 60.16], [24.96, 60.16], ...]]
  },
  "properties": {
    "postinumero": "00100",
    "nimi": "Helsinki Keskusta",
    "average_heat_exposure": 0.65,
    "min_heat_exposure": 0.42,
    "max_heat_exposure": 0.89,
    "building_count": 1247
  }
}
```

**DM3: Heat Timeseries Entry**

```json
{
	"date": "2022-06-28",
	"avgheatexposure": 0.67
}
```

**DM4: Min/Max Kelvin Lookup**

```javascript
{
  "2022-06-28": {
    "min": 291.5040893555,
    "max": 332.274230957
  }
}
```

### Calculation Formulas

**CF1: Heat Index Normalization**

```javascript
// Convert Celsius to normalized index (0-1)
const tempKelvin = tempCelsius + 273.15;
const minKelvin = minMaxKelvin[date].min;
const maxKelvin = minMaxKelvin[date].max;
const index = (tempKelvin - minKelvin) / (maxKelvin - minKelvin);
```

**CF2: Heat Index Denormalization**

```javascript
// Convert normalized index to Celsius for display
const minKelvin = minMaxKelvin[date].min;
const maxKelvin = minMaxKelvin[date].max;
const tempKelvin = index * (maxKelvin - minKelvin) + minKelvin;
const tempCelsius = tempKelvin - 273.15;
```

**CF3: Average Postal Code Heat Exposure**

```javascript
let total = 0;
let count = 0;
for (const building of buildings) {
	const heatValue = helsinkiView
		? building.properties.avgheatexposuretobuilding
		: building.properties.heat_timeseries?.find((entry) => entry.date === targetDate)
				?.avgheatexposure;

	if (heatValue !== null && heatValue !== undefined) {
		total += heatValue;
		count++;
	}
}
const average = count > 0 ? total / count : 0;
```

**CF4: Warm Color Gradient**

```javascript
// Red-orange gradient for hot days
const getWarmColor = (index) => {
	const g = 255 - index * 255; // Green decreases as heat increases
	const a = index; // Alpha increases with heat
	return `rgba(255, ${g}, 0, ${a})`;
};
```

**CF5: Cold Color Gradient**

```javascript
// Blue-green gradient for cold day (2021-02-18)
const getColdColor = (index) => {
	const g = 255 - (255 - index * 255); // Green increases as cold increases
	const a = 1 - index; // Alpha decreases with cold
	return `rgba(0, ${g}, 255, ${a})`;
};
```

## Success Metrics

### Key Performance Indicators (KPIs)

**KPI1: Feature Adoption**

- **Metric**: Percentage of sessions using timeline feature
- **Target**: 70% of postal code view sessions interact with timeline
- **Measurement**: Analytics event tracking on slider interaction
- **Data Source**: Google Analytics custom events
- **Frequency**: Weekly review, monthly reporting

**KPI2: Temporal Exploration Depth**

- **Metric**: Average number of timeline dates explored per session
- **Target**: 3+ dates explored per session
- **Measurement**: Count of unique dates selected in single session
- **Data Source**: Session analytics with date selection tracking
- **Frequency**: Monthly analysis

**KPI3: Histogram Interaction Rate**

- **Metric**: Percentage of histogram views resulting in bar clicks
- **Target**: 40% of histogram displays lead to building highlighting
- **Measurement**: Ratio of histogram bar clicks to histogram renders
- **Data Source**: Event tracking on histogram interactions
- **Frequency**: Bi-weekly analysis

**KPI4: Data Quality**

- **Metric**: Percentage of buildings with matched heat data
- **Target**: 95% of buildings have heat exposure values
- **Measurement**: Ratio of buildings with non-null heat values to total buildings
- **Data Source**: Server-side data quality monitoring
- **Frequency**: Daily automated checks

### Measurement Methodology

**MM1: Analytics Implementation**

- Google Analytics 4 custom events:
  - `timeline_date_change`: Triggered on slider interaction (event parameter: date)
  - `histogram_bar_click`: Triggered on bar click (event parameter: heat_range)
  - `heat_data_missing`: Triggered when building lacks heat data (event parameter: building_id)
  - `postal_code_heat_view`: Triggered on postal code selection with heat data
- User ID tracking for session analysis
- Session duration tracking for engagement metrics
- Bounce rate tracking for feature landing pages

**MM2: Data Collection**

- Client-side: JavaScript analytics SDK in main Vue app
- Server-side: API request logging in nginx/application logs
- Database: Automated queries for data quality metrics
- Error tracking: Sentry integration for heat data fetch failures

**MM3: Reporting Dashboard**

- Weekly KPI summary dashboard (Data Studio or similar)
- Monthly trend analysis reports
- Quarterly feature performance reviews
- Real-time data quality monitoring (Grafana)

### Success Criteria & Thresholds

**SC1: Business Metrics**

- **User Adoption**: 70% of researchers use timeline feature regularly (monthly)
- **Engagement**: Average session duration on postal code heat view > 5 minutes
- **Retention**: 60% of users return to heat analysis feature within 30 days
- **Coverage**: Heat data available for 95%+ of Capital Region buildings

**SC2: Quality Metrics**

- **Performance**: 95th percentile response time < 3 seconds for all operations
- **Reliability**: 99.5% uptime for pygeoapi heat data endpoints
- **Accuracy**: Zero reported calculation errors in production (validated by researchers)
- **Usability**: System Usability Scale (SUS) score > 75

**SC3: Technical Metrics**

- **Error Rate**: < 0.5% of heat data fetches result in errors
- **Response Time**: Median timeline date change < 1 second
- **Browser Performance**: No long tasks (>50ms) during histogram rendering
- **Memory Usage**: < 500MB heap usage for typical postal code with 5000 buildings

### Quality Metrics

**QM1: Performance Regression Detection**

- **Metric**: Playwright performance tests monitor critical user flows
- **Baseline**: Established from initial implementation
- **Threshold**: No operation should exceed 150% of baseline
- **Monitoring**: Automated performance tests in CI/CD pipeline
- **Alerting**: Slack notification on performance regression

**QM2: Accessibility Compliance**

- **Metric**: Automated axe-core accessibility test pass rate
- **Target**: 100% of automated tests pass
- **Coverage**: Timeline component, histogram, building tooltips
- **Monitoring**: Playwright accessibility tests in CI/CD
- **Manual Testing**: Monthly WCAG 2.1 AA manual audit

**QM3: Cross-Browser Compatibility**

- **Metric**: Feature functionality across target browsers
- **Target**: 100% feature parity on Chrome, Firefox, Safari, Edge
- **Testing**: Automated Playwright tests on all browsers
- **Frequency**: Pre-release testing for all deployments
- **Known Issues**: Safari WebGL performance monitored

## Out of Scope

### Explicitly Excluded Features

**EX1: Real-Time Heat Monitoring**

- Live heat data updates from sensors or satellites
- Current-day heat exposure visualization
- Push notifications for heat alerts
- Automatic data refresh intervals
- **Rationale**: Landsat revisit time is 8-16 days; not suitable for real-time monitoring
- **Future Consideration**: Integrate with weather API for current temperature overlays

**EX2: Heat Exposure Forecasting**

- Predictive heat models for future dates
- Climate change scenario modeling (RCP 4.5, 8.5)
- Machine learning heat predictions
- Seasonal heat pattern forecasting
- **Rationale**: Requires climate modeling expertise outside current scope
- **Future Consideration**: Collaborate with climate modeling team for 2050 scenarios

**EX3: Demographic Heat Vulnerability Analysis**

- Integration with census demographic data
- Socioeconomic vulnerability indices
- Age-stratified heat exposure analysis
- Social vulnerability overlays
- **Rationale**: Privacy concerns and data integration complexity
- **Future Consideration**: Separate PRD for socioeconomic data integration (postal code level only)

**EX4: Heat Mitigation Scenario Planning**

- "What-if" tree planting scenario modeling
- Cool roof intervention impact simulation
- Urban greening scenario comparisons
- Cost-benefit analysis for interventions
- **Rationale**: Requires environmental modeling and economic analysis tools
- **Future Consideration**: Integration with adaptation scenario tools (separate feature)

**EX5: Data Export & API Access**

- CSV/GeoJSON export of heat exposure data
- Public API endpoints for third-party access
- Batch data download for offline analysis
- Programmatic access to heat timeseries
- **Rationale**: Data licensing and access control not yet established
- **Future Consideration**: Research data repository with proper attribution

**EX6: Building-Specific Heat Recommendations**

- Automated cool roof suitability analysis
- Tree planting recommendations per building
- HVAC efficiency suggestions based on heat exposure
- Building energy audit integration
- **Rationale**: Requires building engineering expertise and validation
- **Future Consideration**: Partner with energy efficiency programs

**EX7: Mobile Native Applications**

- iOS/Android native apps
- Offline mode for field work
- GPS-based heat exposure lookup
- Push notifications for nearby high-heat areas
- **Rationale**: Web application meets current user needs; native development costly
- **Future Consideration**: Progressive Web App (PWA) for offline support

**EX8: Multi-City Heat Comparisons**

- Heat exposure data for cities outside Capital Region
- Inter-city heat ranking and benchmarking
- Global urban heat island database integration
- Cross-region heat pattern analysis
- **Rationale**: Data availability limited to Helsinki Capital Region
- **Future Consideration**: Expand to other Finnish cities if data becomes available

### Future Enhancements

**FE1: Enhanced Temporal Analysis (Q4 2025)**

- Heat trend charts showing exposure change over time
- Anomaly detection for unusually hot/cold years
- Seasonal heat pattern comparison
- Multi-year average heat exposure baselines

**FE2: Advanced Visualization (Q1 2026)**

- 3D heat surface visualization (heat "mountains")
- Animated heat evolution playback (2015-2025)
- Side-by-side year comparison view
- Heat exposure change maps (year-over-year difference)

**FE3: Reporting & Collaboration (Q2 2026)**

- Generate PDF heat exposure reports for postal codes
- Shareable heat analysis snapshots with annotations
- Collaborative workspace for research teams
- Export high-resolution map images with heat overlays

## Timeline & Resources

### Development Phases

#### Phase 1: Foundation (Weeks 1-2)

**Deliverables:**

- Timeline component UI implementation
- Global state integration for date selection
- URL state persistence for heat date
- Basic heat histogram visualization

**Resources:**

- 1 Frontend Developer (full-time)
- 1 UX Designer (50% allocation)

**Dependencies:**

- Vue 3 + Vuetify setup complete
- Pinia stores initialized
- D3.js integrated in project

**Risks:**

- Slider component customization may require Vuetify expertise

#### Phase 2: Data Integration (Weeks 3-4)

**Deliverables:**

- Building-heat attribute matching logic
- Heat timeseries filtering by construction date
- Postal code heat aggregation calculations
- Orphan heat data handling

**Resources:**

- 1 Frontend Developer (full-time)
- 1 Backend Developer (25% - API support)
- 1 Data Engineer (50% - pygeoapi optimization)

**Dependencies:**

- Pygeoapi `urban_heat_building` endpoint operational
- Building WFS data accessible
- Min/max Kelvin values validated by climate team

**Risks:**

- Large postal codes (10,000+ buildings) may cause performance issues
- Heat data matching accuracy depends on ID consistency

#### Phase 3: Visualization Enhancement (Weeks 5-6)

**Deliverables:**

- Interactive heat histogram with building highlighting
- Heat color gradients (warm/cold)
- Histogram tooltips and click handlers
- Responsive histogram layout

**Resources:**

- 1 Frontend Developer (full-time)
- 1 UX Designer (25% - interaction design)

**Dependencies:**

- Building service refactored for highlighting support
- CesiumEntityManager supports batch entity selection
- D3.js histogram utilities implemented

**Risks:**

- Histogram rendering performance with 5000+ buildings
- Building highlighting may conflict with other selection modes

#### Phase 4: Performance Optimization (Week 7)

**Deliverables:**

- Batched entity processing (25 per batch)
- RequestIdleCallback integration for UI responsiveness
- Lazy data loading for timeline dates
- Console performance profiling and optimization

**Resources:**

- 1 Frontend Developer (full-time)
- 1 Performance Engineer (50% - profiling support)

**Dependencies:**

- Playwright performance test framework set up
- Performance baseline metrics established

**Risks:**

- Older browsers may not support requestIdleCallback (polyfill needed)

#### Phase 5: Testing & Accessibility (Week 8)

**Deliverables:**

- Playwright end-to-end tests for heat workflow
- Accessibility audit and fixes (WCAG 2.1 AA)
- Cross-browser compatibility testing
- Performance regression test suite

**Resources:**

- 1 QA Engineer (full-time)
- 1 Accessibility Specialist (50%)
- 1 Frontend Developer (25% - bug fixes)

**Dependencies:**

- Test data sets prepared for all 10 heat dates
- Playwright test infrastructure complete

**Risks:**

- Accessibility fixes may require UI design changes

#### Phase 6: Documentation & Launch (Week 9)

**Deliverables:**

- User documentation and tutorials
- API documentation for heat data endpoints
- Code documentation and inline comments
- Release notes and changelog
- Analytics tracking implementation

**Resources:**

- 1 Technical Writer (full-time)
- 1 Product Manager (50% - launch coordination)
- 1 Frontend Developer (25% - analytics integration)

**Dependencies:**

- Staging environment ready for UAT
- Climate research team available for validation

**Risks:**

- User documentation may require iteration based on UAT feedback

### Resource Requirements

**RR1: Personnel**

- Frontend Developer: 9 weeks full-time (1 FTE)
- UX Designer: 3 weeks equivalent (0.33 FTE)
- Backend Developer: 1 week equivalent (0.11 FTE)
- Data Engineer: 2 weeks equivalent (0.22 FTE)
- QA Engineer: 1 week full-time (0.11 FTE)
- Performance Engineer: 0.5 weeks equivalent (0.06 FTE)
- Accessibility Specialist: 0.5 weeks equivalent (0.06 FTE)
- Technical Writer: 1 week full-time (0.11 FTE)
- Product Manager: 0.5 weeks equivalent (0.06 FTE)

**Total Effort:** ~10.5 person-weeks

**RR2: Infrastructure**

- Pygeoapi server capacity: 1000 requests/min for heat data endpoints
- CDN bandwidth: 500 GB/month for NDVI imagery
- Database storage: 50 GB for heat timeseries (10 years, 100k buildings)
- Analytics: Google Analytics 4 property with custom events

**RR3: Tools & Licenses**

- Vue 3 + Vuetify (open source)
- D3.js (open source)
- CesiumJS (Apache 2.0 license)
- Playwright (open source)
- Sentry error tracking (team plan, $26/month)
- Figma for design collaboration (professional plan, $15/user/month)

### Risk Assessment

**Risk 1: Data Quality Issues**

- **Probability**: Medium (30%)
- **Impact**: High
- **Description**: Building-heat ID mismatches cause low match rates (<90%)
- **Mitigation**:
  - Validate ID consistency in development environment
  - Implement data quality monitoring dashboard
  - Add manual building-heat linking tool for orphans
- **Contingency**: Fall back to spatial join if ID matching fails

**Risk 2: Performance Degradation**

- **Probability**: Medium (40%)
- **Impact**: Medium
- **Description**: Large postal codes (10,000+ buildings) cause UI freezing
- **Mitigation**:
  - Implement progressive rendering (virtual scrolling for histogram)
  - Increase batch size dynamically based on browser performance
  - Add loading indicators for long operations
- **Contingency**: Limit feature to postal codes <5000 buildings initially

**Risk 3: Browser Compatibility**

- **Probability**: Low (15%)
- **Impact**: Medium
- **Description**: Safari WebGL performance issues affect Cesium rendering
- **Mitigation**:
  - Test on Safari early in development (Phase 3)
  - Implement WebGL fallback or reduced quality mode
  - Document known Safari limitations
- **Contingency**: Display browser compatibility warning on Safari

**Risk 4: Timeline Date Availability**

- **Probability**: Low (10%)
- **Impact**: High
- **Description**: Future heat data (2025) not available by launch
- **Mitigation**:
  - Confirm data availability with pygeoapi team in Phase 1
  - Make timeline dates dynamically configurable
  - Add "coming soon" state for unreleased dates
- **Contingency**: Launch with available dates (2015-2024) only

**Risk 5: User Adoption**

- **Probability**: Medium (25%)
- **Impact**: High
- **Description**: Users don't discover or understand timeline feature
- **Mitigation**:
  - Add prominent timeline component in default view
  - Implement first-use tutorial/tooltip
  - Create video walkthrough for researchers
- **Contingency**: Add contextual help and in-app guidance

**Risk 6: Accessibility Compliance**

- **Probability**: Medium (35%)
- **Impact**: Medium
- **Description**: D3.js histogram fails accessibility audit (keyboard nav, screen reader)
- **Mitigation**:
  - Involve accessibility specialist in Phase 2 design
  - Use ARIA landmarks and roles
  - Test with screen readers early (Phase 5)
- **Contingency**: Provide alternative data table view for histogram

## Integration Considerations

### CI/CD Pipeline Requirements

**CI1: Automated Testing**

- Playwright end-to-end tests for heat workflow:
  - Timeline date selection and map update
  - Histogram generation and interaction
  - Building highlighting from histogram clicks
  - Postal code heat aggregation display
- Vitest unit tests for calculation functions:
  - Heat index normalization/denormalization
  - Average postal code heat exposure
  - Heat color gradient calculations
  - Heat timeseries filtering logic
- Performance regression tests:
  - Timeline date change response time
  - Histogram rendering time
  - Building-heat matching duration

**CI2: Test Data Management**

- Fixture data for all 10 heat dates (2015-2025)
- Sample postal code with known heat values for validation
- Mock building features with heat timeseries
- Min/max Kelvin fixtures for each date

**CI3: Quality Gates**

- All unit tests pass (100% of tests)
- E2E tests pass on Chrome, Firefox, Safari (100% pass rate)
- Accessibility tests pass (axe-core, 0 violations)
- Performance tests within thresholds (95th percentile <3s)
- Code coverage >80% for heat calculation logic
- No ESLint errors or warnings
- Bundle size increase <5% compared to baseline

### Deployment Strategy

**DS1: Phased Rollout**

1. **Internal Testing (Week 8)**
   - Deploy to staging environment
   - Climate research team UAT (5 users)
   - Bug fixes and minor adjustments
2. **Beta Launch (Week 9)**
   - Deploy to production with feature flag (10% users)
   - Monitor performance and error rates
   - Collect user feedback via in-app survey
3. **Full Launch (Week 10)**
   - Enable feature for 100% of users
   - Publish user documentation
   - Announce via email and in-app notification

**DS2: Feature Flags**

- Feature flag: `heat_timeline_enabled`
- Controlled via environment variable or admin panel
- Allows instant rollback if critical issues found
- Per-user targeting for A/B testing (future)

**DS3: Rollback Plan**

- Database schema unchanged (no migrations needed)
- API endpoints backward compatible
- Rollback to previous frontend build within 5 minutes
- Keep previous 3 releases in CDN for instant rollback

### Monitoring and Alerting Needs

**MA1: Application Performance Monitoring**

- **Tool**: Sentry Performance Monitoring
- **Metrics**:
  - Timeline date change duration (p50, p95, p99)
  - Histogram render time (p50, p95, p99)
  - Building-heat matching duration (p50, p95, p99)
  - API request duration (pygeoapi heat endpoints)
- **Alerts**:
  - P95 response time >3s for any operation (Slack notification)
  - Error rate >1% for heat data fetches (PagerDuty alert)

**MA2: Error Tracking**

- **Tool**: Sentry Error Tracking
- **Scope**:
  - JavaScript errors in Timeline component
  - D3.js rendering errors in HeatHistogram
  - API fetch failures (pygeoapi, WFS)
  - Heat data matching errors (ID mismatches)
- **Alerts**:
  - New error types (immediate Slack notification)
  - Error frequency >10 occurrences/hour (escalation)

**MA3: Business Metrics Monitoring**

- **Tool**: Google Analytics 4 + Data Studio Dashboard
- **Metrics**:
  - Timeline feature usage rate (% of sessions)
  - Average dates explored per session
  - Histogram interaction rate
  - Postal code heat view duration
- **Review Cadence**: Weekly dashboard review, monthly trends

**MA4: Data Quality Monitoring**

- **Tool**: Custom Grafana dashboard + Postgres queries
- **Metrics**:
  - Building-heat match rate (% with non-null heat values)
  - Orphan heat polygon count per postal code
  - API endpoint availability (pygeoapi uptime)
  - Data freshness (last heat data update timestamp)
- **Alerts**:
  - Match rate <90% for any postal code (daily check)
  - Pygeoapi endpoint downtime >5 minutes (immediate alert)

### Documentation Requirements

**DR1: User Documentation**

- **Timeline Feature Guide**: How to select and explore heat dates
- **Heat Histogram Interpretation**: Understanding distribution and building highlighting
- **Use Case Tutorials**:
  - "Identifying High-Heat Neighborhoods for Intervention Planning"
  - "Analyzing Temporal Heat Trends for Research"
  - "Comparing Building Heat Exposure Across Years"
- **FAQ**: Common questions about heat data sources, accuracy, dates

**DR2: Technical Documentation**

- **Heat Calculation Reference**: Normalization formulas, color gradient algorithms
- **API Integration Guide**: Pygeoapi endpoint usage, data structure, query parameters
- **Component Architecture**: Timeline, HeatHistogram, service layer interaction
- **Performance Optimization**: Batching strategies, UI responsiveness techniques

**DR3: Code Documentation**

- **JSDoc Comments**: All public functions, getters, actions in stores and services
- **Inline Comments**: Complex heat calculation logic, edge case handling
- **README Updates**: Feature overview, setup instructions, testing commands
- **Changelog**: Version history with feature additions and bug fixes

**DR4: Operational Documentation**

- **Runbook**: Common issues and resolution steps (e.g., pygeoapi timeout)
- **Monitoring Dashboard Setup**: Grafana configuration, alert thresholds
- **Deployment Checklist**: Pre-deployment verification, rollback procedure
- **Data Update Procedure**: How to add new heat dates to the system

---

## Appendices

### A. Heat Data Sources & Methodology

**A.1 Landsat Collection 2 Surface Temperature**

- **Satellite**: Landsat 8/9 (TIRS sensor)
- **Spatial Resolution**: 30m (resampled to building footprints)
- **Temporal Resolution**: 16-day revisit cycle
- **Processing**: USGS Collection 2 Level-2 surface temperature product
- **Documentation**: https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature

**A.2 Heat Exposure Index Calculation**

- Building-level average derived from Landsat pixels within building footprint
- Normalized to 0-1 scale using date-specific min/max values
- Min/max values computed from entire Capital Region for each date
- Preserves relative heat differences within each observation date

**A.3 Data Validation**

- Cross-validated with ground-based temperature sensors (10% sample)
- Accuracy: ±2°C compared to meteorological station data
- Cloud-free images only (cloud masking applied during processing)
- Urban heat island effect validated against literature values

### B. Technology Stack Details

**B.1 Frontend Framework**

- Vue 3.4.21 with Composition API
- Vite 5.1.0 for build tooling and HMR
- Pinia 2.1.7 for state management
- Vue Router 4.3.0 for URL state management

**B.2 Visualization Libraries**

- CesiumJS 1.115.0 for 3D globe and building rendering
- D3.js 7.8.5 for histogram and data visualization
- Vuetify 3.5.10 for UI components (slider, chips, cards)

**B.3 Data Services**

- Pygeoapi 0.15.0 (OGC API - Features implementation)
- PostgreSQL 15 + PostGIS 3.4 (backend database)
- Helsinki WFS (kartta.hel.fi) for building geometry

**B.4 Development Tools**

- Playwright 1.41.0 for E2E testing
- Vitest 1.2.2 for unit testing
- ESLint 8.56.0 for code linting
- Prettier 3.2.5 for code formatting

### C. Glossary

- **Building Heat Exposure**: Average surface temperature of building footprint during satellite overpass, normalized to 0-1 scale
- **Capital Region**: Helsinki, Espoo, Vantaa, and Kauniainen municipalities
- **Cold Date**: 2021-02-18 (winter measurement, used for cooling pattern analysis)
- **GeoJSON**: Geographic data format based on JSON (used for building and heat data)
- **Heat Index**: Normalized heat exposure value (0-1) relative to regional min/max
- **Heat Timeseries**: Array of heat exposure values across multiple dates for a single building
- **Helsinki View**: View mode focused on Helsinki municipality only (vs Capital Region)
- **Landsat Surface Temperature**: Satellite-derived land surface temperature from thermal infrared sensor
- **Min/Max Kelvin**: Date-specific temperature bounds in Kelvin used for heat normalization
- **Orphan Heat Data**: Heat polygons from pygeoapi without matching building ID in WFS data
- **Postal Code Heat Aggregation**: Average heat exposure computed across all buildings in postal code area
- **Pygeoapi**: Python implementation of OGC API standards for geospatial data access
- **Urban Heat Island Effect**: Phenomenon where urban areas are significantly warmer than surrounding rural areas
- **WFS (Web Feature Service)**: OGC standard for serving vector geospatial data

### D. Change Log

| Version | Date       | Changes                                 | Author           |
| ------- | ---------- | --------------------------------------- | ---------------- |
| 1.0     | 2025-01-15 | Initial PRD creation                    | PRD Writer Agent |
| 1.1     | 2025-01-20 | Added stakeholder matrix                | Product Team     |
| 1.2     | 2025-01-25 | Expanded success metrics section        | Analytics Lead   |
| 1.3     | 2025-02-01 | Technical review and formula validation | Engineering Lead |

### E. References

1. **Landsat Collection 2 Surface Temperature**: https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature
2. **Urban Heat Island Effect**: https://www.epa.gov/heatislands
3. **OGC API - Features**: https://ogcapi.ogc.org/features/
4. **D3.js Histogram Documentation**: https://github.com/d3/d3-array#bin
5. **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
6. **Vue 3 Composition API**: https://vuejs.org/guide/extras/composition-api-faq.html
7. **CesiumJS Entity API**: https://cesium.com/learn/cesiumjs/ref-doc/Entity.html
8. **Pinia State Management**: https://pinia.vuejs.org/

---

**Document Control**

- **Status**: Draft
- **Owner**: Climate Adaptation Research Team
- **Stakeholders**: Engineering, UX, Public Health, Urban Planning
- **Review Cycle**: Bi-weekly until approval
- **Approval Required**: Research Team Lead, Engineering Director, Product Manager
- **Next Review**: 2025-02-10
