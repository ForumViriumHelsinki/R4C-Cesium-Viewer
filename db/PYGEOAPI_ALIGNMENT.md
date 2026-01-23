# Database Schema and pygeoapi Alignment Report

This document shows the alignment between database tables/views and pygeoapi collections.

## ✅ Properly Aligned Collections

| pygeoapi Collection      | Database Table/View      | Type  | Notes                            |
| ------------------------ | ------------------------ | ----- | -------------------------------- |
| `adaptation_landcover`   | `adaptation_landcover`   | Table | Direct match                     |
| `hki_roof_colors`        | `hki_roof_colors_f`      | View  | Based on `hki_roof_colors` table |
| `hki_travel_time`        | `hki_travel_time_r4c_f`  | Table | Direct match                     |
| `vegetation`             | `nature_area_f`          | Table | Direct match                     |
| `othernature`            | `other_nature_r4c`       | Table | Direct match                     |
| `coldarea`               | `r4c_coldspot`           | Table | Direct match                     |
| `tree_building_distance` | `tree_building_distance` | Table | Direct match                     |
| `tree`                   | `tree_f`                 | Table | Direct match                     |
| `urban_heat_building`    | `urban_heat_building_f`  | Table | Direct match                     |

## 🔍 Collections Using Views

| pygeoapi Collection       | Database View/Mat View | Underlying Tables                                   |
| ------------------------- | ---------------------- | --------------------------------------------------- |
| `hsy_buildings`           | `r4c_hsy_building`     | `r4c_hsy_building_current` + `hsy_building_heat`    |
| `hsy_buildings_optimized` | `r4c_hsy_building_mat` | Materialized view of above (requires refresh)       |
| `heatexposure`            | `r4c_postalcode`       | `hsy_building_heat` + `r4c_paavo` + `hki_urbanheat` |
| `heatexposure_optimized`  | `r4c_postalcode_mat`   | Materialized view of above (requires refresh)       |

## 📊 Collections Using External Data Sources

| pygeoapi Collection          | Data Source            | Notes                                |
| ---------------------------- | ---------------------- | ------------------------------------ |
| `populationgrid`             | GeoJSON file           | `tests/data/populationgrid.json`     |
| `capitalregion_postalcode`   | GeoJSON file           | `tests/data/hsy_po.json`             |
| Survey collections           | GeoJSON files          | Various `tests/data/*.geojson` files |
| `tree_spotted` (disabled)    | External DB (med_iren) | Not in this migration                |
| `ndvi_timeseries` (disabled) | External DB (med_iren) | Not in this migration                |

## 🌱 Seed Script Data Flow

The seed script (`db/scripts/seed-dev-data.py`) populates data that flows through to pygeoapi as follows:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Seed Script Tables → pygeoapi Collections                           │
├─────────────────────────────────────────────────────────────────────┤
│ r4c_hsy_building_current ─┐                                         │
│ hsy_building_heat ────────┼─→ r4c_hsy_building (VIEW) → hsy_buildings
│                           └─→ r4c_hsy_building_mat (MAT VIEW) → hsy_buildings_optimized
├─────────────────────────────────────────────────────────────────────┤
│ r4c_paavo ────────────────┐                                         │
│ hsy_building_heat ────────┼─→ r4c_postalcode (VIEW) → heatexposure  │
│ hki_urbanheat ────────────┘                                         │
│                           └─→ r4c_postalcode_mat (MAT VIEW) → heatexposure_optimized
├─────────────────────────────────────────────────────────────────────┤
│ r4c_coldspot ────────────────→ r4c_coldspot → coldarea              │
│ tree_f ──────────────────────→ tree_f → tree                        │
│ urban_heat_building_f ───────→ urban_heat_building_f → urban_heat_building
│ adaptation_landcover ────────→ adaptation_landcover                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Important**: After seeding, materialized views (`r4c_hsy_building_mat`, `r4c_postalcode_mat`)
must be refreshed. The seed script does this automatically when seeding all tables.

## 🗄️ Database Tables Not Exposed via pygeoapi

These tables exist in the database but are not exposed as collections:

- `building_tree*` tables
- `flood*` tables
- `heat_vulnerable_demographic`
- `hki_urbanheat` (used by views)
- `hsy_building_heat` (used by views)
- `kafka_finest_station`
- `keharist_*` tables
- `nature_area` (base table)
- `r4c_heat_timeseries`
- `r4c_hsy_building_*` backup/copy tables
- `r4c_paavo` (used by views)
- `r4c_users`
- `tree_distance_building`
- `urban_heat_building` (base table)
- `urbanheattest`
- `vegetation_r4c`

## ✅ Migration Compatibility

The baseline migration includes all necessary tables and views to support the current pygeoapi configuration. All required spatial columns (`geom_field`) and ID fields (`id_field`) are properly defined.

### Key Observations:

1. Views are properly included in the migration
2. PostGIS extension is correctly set up
3. Spatial indexes are included for performance
4. All primary keys and constraints are preserved
5. The schema_migrations table is included for dbmate tracking
