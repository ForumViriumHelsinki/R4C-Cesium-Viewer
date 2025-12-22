# Building Properties Reference

This document describes the GeoJSON properties used for building data in the R4C-Cesium-Viewer application. Buildings come from two main sources: the Capital Region view (HSY data) and the Helsinki view (City of Helsinki data).

## Property Categories

- [Identifiers](#identifiers)
- [Location](#location)
- [Building Type](#building-type)
- [Physical Characteristics](#physical-characteristics)
- [Construction Date](#construction-date)
- [Heat Exposure Data](#heat-exposure-data)
- [Address](#address)
- [Population Distribution](#population-distribution)

---

## Identifiers

| Property  | Type   | Description                                                                                              | Used By                               |
| --------- | ------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `id`      | string | Helsinki-style ID in format `HKI_{postal}_{index}`. Used for matching buildings with urban heat data.    | Heat data association                 |
| `vtj_prt` | string | Building ID from the Population Register Centre (VTJ). Format: 9 digits + 1 letter (e.g., `123456789A`). | Entity identification, tooltip lookup |
| `ratu`    | number | Building registry ID (rakennustunnus). 6-digit numeric identifier.                                       | Building registry lookup              |
| `hki_id`  | string | Helsinki building ID. Used in urban heat building data to match with main building data.                 | Heat data matching                    |

---

## Location

| Property      | Type   | Description                                                  | Used By                         |
| ------------- | ------ | ------------------------------------------------------------ | ------------------------------- |
| `postinumero` | string | Finnish postal code (5 digits, e.g., `00100`).               | Postal code filtering, grouping |
| `posno`       | string | Alias for `postinumero`. Some data sources use this variant. | Legacy compatibility            |
| `kunta`       | string | Municipality name: `Helsinki`, `Espoo`, or `Vantaa`.         | Municipality filtering          |

---

## Building Type

Buildings have both string-based and numeric type classifications. The string type is used in Capital Region view, while the numeric code is used in Helsinki view for SOTE (social/healthcare) filtering.

| Property     | Type   | Description                                                        | Used By                        |
| ------------ | ------ | ------------------------------------------------------------------ | ------------------------------ |
| `kayttarks`  | string | Building usage type (Finnish). Used in Capital Region view.        | Building filter (non-Helsinki) |
| `c_kayttark` | number | Numeric building usage code per Statistics Finland classification. | SOTE filter (Helsinki view)    |

### Building Type Strings (`kayttarks`)

| Value                | English              |
| -------------------- | -------------------- |
| `Asuinrakennus`      | Residential building |
| `Liikerakennus`      | Commercial building  |
| `Teollisuusrakennus` | Industrial building  |
| `Yleinen rakennus`   | Public building      |
| `Toimistorakennus`   | Office building      |

### Building Type Codes (`c_kayttark`)

Based on [Statistics Finland building classification](https://www.stat.fi/meta/luokitukset/rakennus/001-1994/index.html):

| Code Range  | Category                   | Examples                           |
| ----------- | -------------------------- | ---------------------------------- |
| 011-039     | Residential                | Single-family, row houses          |
| 111-129     | Apartment buildings        | Apartment blocks                   |
| **211-259** | **Social services (SOTE)** | Day care (211), elderly care (241) |
| **311-369** | **Healthcare (SOTE)**      | Health centers (311), hospitals    |
| 511-529     | Office buildings           | Offices                            |
| 611-699     | Commercial                 | Retail, hotels                     |
| 711-739     | Industrial                 | Factories, warehouses              |
| 811-899     | Educational                | Schools, universities              |

**SOTE buildings** (codes 211-259 and 311-369) are highlighted when the "Social & Healthcare" filter is enabled in Helsinki view.

---

## Physical Characteristics

| Property          | Type   | Unit   | Description                                                                                 | Used By                               |
| ----------------- | ------ | ------ | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| `kerrosten_lkm`   | number | floors | Number of floors. Used in Capital Region view.                                              | Tall buildings filter (non-Helsinki)  |
| `i_kerrlkm`       | number | floors | Number of floors. Helsinki data format.                                                     | Tall buildings filter (Helsinki view) |
| `measured_height` | number | meters | Measured building height. Priority source for 3D visualization.                             | 3D building extrusion                 |
| `area_m2`         | number | m²     | Building footprint area.                                                                    | Building statistics                   |
| `kavu`            | number | m³     | Building volume estimate (kerrosala × height factor).                                       | Volume calculations                   |
| `lammitystapa_s`  | string | -      | Heating type (e.g., `DISTRICT_HEATING`, `ELECTRIC`, `OIL`, `GAS`, `GEOTHERMAL`).            | Building characteristics              |
| `rakennusaine_s`  | string | -      | Primary construction material (Finnish: `Betoni`, `Tiili`, `Puu`, `Teräs`, `Kivi`, `Lasi`). | Tooltip display                       |

### Construction Materials (`rakennusaine_s`)

| Finnish  | English  |
| -------- | -------- |
| `Betoni` | Concrete |
| `Tiili`  | Brick    |
| `Puu`    | Wood     |
| `Teräs`  | Steel    |
| `Kivi`   | Stone    |
| `Lasi`   | Glass    |

### 3D Height Calculation

Building height for 3D visualization is determined in this priority order:

1. `measured_height` - Direct measurement (most accurate)
2. `i_kerrlkm × 3.2` - Estimated from floor count (~3.2m per floor)
3. Default: 10 meters

---

## Construction Date

| Property               | Type   | Format       | Description                                       | Used By              |
| ---------------------- | ------ | ------------ | ------------------------------------------------- | -------------------- |
| `year_of_construction` | string | `YYYY`       | Year the building was constructed.                | Building age display |
| `c_valmpvm`            | string | `YYYY-MM-DD` | Building completion date (valmistumispäivämäärä). | Pre-2018 filter      |

The **Pre-2018 filter** (Helsinki view) hides buildings completed after June 2018, which is when the urban heat baseline measurements were taken.

---

## Heat Exposure Data

Heat exposure data enables visualization of urban heat island effects on buildings.

| Property                    | Type   | Description                                                                   | Used By                              |
| --------------------------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------ |
| `avgheatexposure`           | number | Legacy heat exposure value (0-1 scale).                                       | Backward compatibility               |
| `avgheatexposuretobuilding` | number | Average heat exposure to building surface (0-1 scale). Higher = more exposed. | Helsinki view heat coloring          |
| `avg_temp_c`                | number | Average surface temperature in Celsius. Direct value for quick access.        | Tooltip display                      |
| `heat_timeseries`           | array  | Time series of heat measurements. See structure below.                        | Capital Region heat coloring, charts |
| `distancetounder40`         | number | Distance in meters to nearest cooling area (area with <40% heat exposure).    | Cooling accessibility analysis       |

### Heat Timeseries Structure

```json
{
	"heat_timeseries": [
		{
			"date": "2023-07-15",
			"avg_temp_c": 28.5,
			"avgheatexposure": 0.65
		}
	]
}
```

| Field             | Type   | Description                     |
| ----------------- | ------ | ------------------------------- |
| `date`            | string | Measurement date (`YYYY-MM-DD`) |
| `avg_temp_c`      | number | Average temperature in Celsius  |
| `avgheatexposure` | number | Heat exposure value (0-1 scale) |

**Available dates:** The application typically has data for summer dates (June-August) across multiple years, plus one winter reference date (`2021-02-18`).

### Heat Exposure Scale

| Value   | Interpretation      | Color      |
| ------- | ------------------- | ---------- |
| 0.0-0.3 | Low exposure (cool) | Green/Blue |
| 0.3-0.5 | Moderate            | Yellow     |
| 0.5-0.7 | High                | Orange     |
| 0.7-1.0 | Very high (hot)     | Red        |

---

## Address

| Property         | Type   | Description                                       | Used By                          |
| ---------------- | ------ | ------------------------------------------------- | -------------------------------- |
| `katunimi_suomi` | string | Street name in Finnish (e.g., `Mannerheimintie`). | Tooltip, building identification |
| `osoitenumero`   | string | Street number (e.g., `42`).                       | Tooltip, building identification |
| `katu`           | string | Alternative street name field.                    | Fallback for address             |
| `osno1`          | number | Primary street number (alternative format).       | Fallback for address             |
| `oski1`          | number | Street number suffix/letter (alternative format). | Fallback for address             |
| `osno2`          | number | Secondary street number for corner buildings.     | Fallback for address             |

### Address Resolution

The application tries these formats in order:

1. `katunimi_suomi` + `osoitenumero` (preferred)
2. `katu` + `osno1` + `oski1` + `osno2` (fallback)
3. `"n/a"` if no valid address found

---

## Population Distribution

Population distribution data enables demographic analysis of buildings. Values are fractions (0-1) representing the proportion of residents in each age group.

| Property       | Type   | Age Group   | Description    |
| -------------- | ------ | ----------- | -------------- |
| `pop_d_0_9`    | number | 0-9 years   | Children       |
| `pop_d_10_19`  | number | 10-19 years | Adolescents    |
| `pop_d_20_29`  | number | 20-29 years | Young adults   |
| `pop_d_30_39`  | number | 30-39 years | Adults         |
| `pop_d_40_49`  | number | 40-49 years | Middle-aged    |
| `pop_d_50_59`  | number | 50-59 years | Middle-aged    |
| `pop_d_60_69`  | number | 60-69 years | Pre-retirement |
| `pop_d_70_79`  | number | 70-79 years | Elderly        |
| `pop_d_over80` | number | 80+ years   | Elderly        |

**Note:** These values should sum to approximately 1.0 (100% of building residents).

Used by the **BuildingGridChart** component to display population age distribution for selected buildings.

---

## Data Sources

| View           | Primary Source                               | Description                                      |
| -------------- | -------------------------------------------- | ------------------------------------------------ |
| Capital Region | HSY (Helsinki Region Environmental Services) | Regional building data with heat timeseries      |
| Helsinki       | City of Helsinki                             | Detailed building data with SOTE classifications |
| Mock API       | `mock-api/generate.ts`                       | Synthetic data for development without database  |

---

## Related Documentation

- [Mock API README](../../mock-api/README.md) - Mock data generation
- [Database Seeding](../database/SEEDING.md) - Database population
- [Architecture Overview](../architecture/README.md) - System architecture
