# Database Schema and pygeoapi Alignment Report

This document shows the alignment between database tables/views and pygeoapi collections.

## ✅ Properly Aligned Collections

| pygeoapi Collection | Database Table/View | Type | Notes |
|-------------------|------------------|------|-------|
| `adaptation_landcover` | `adaptation_landcover` | Table | Direct match |
| `hki_roof_colors_f` | `hki_roof_colors_f` | View | Based on `hki_roof_colors` table |
| `hki_travel_time_r4c_f` | `hki_travel_time_r4c_f` | Table | Direct match |
| `nature_area_f` | `nature_area_f` | Table | Direct match |
| `other_nature_r4c` | `other_nature_r4c` | Table | Direct match |
| `r4c_coldspot` | `r4c_coldspot` | Table | Direct match |
| `tree_building_distance` | `tree_building_distance` | Table | Direct match |
| `tree_f` | `tree_f` | Table | Direct match |
| `urban_heat_building_f` | `urban_heat_building_f` | Table | Direct match |

## 🔍 Collections Using Views

| pygeoapi Collection | Database View | Underlying Tables |
|-------------------|-------------|------------------|
| `r4c_hsy_building` | `r4c_hsy_building` | `r4c_hsy_building_current` + `hsy_building_heat` |
| `r4c_postalcode` | `r4c_postalcode` | `hsy_building_heat` + `r4c_paavo` + `hki_urbanheat` |

## 📊 Collections Using External Data Sources

| pygeoapi Collection | Data Source | Notes |
|-------------------|------------|-------|
| `hsy_tree_spotted` | External DB (med_iren) | Not in this migration |
| `spotted_ndvi_range` | External DB (med_iren) | Not in this migration |
| `populationgrid` | GeoJSON file | `tests/data/populationgrid.json` |
| `capitalregion_postalcode` | GeoJSON file | `tests/data/hsy_po.json` |
| Survey collections | GeoJSON files | Various `tests/data/*.geojson` files |

## 🗄️ Database Tables Not Exposed via pygeoapi

These tables exist in the database but are not exposed as collections:
- `building_tree*` tables
- `flood*` tables
- `heat_vulnerable_demographic`
- `hki_urbanheat`
- `hsy_building_heat`
- `kafka_finest_station`
- `keharist_*` tables
- `nature_area` (base table)
- `r4c_heat_timeseries`
- `r4c_hsy_building_*` backup/copy tables
- `r4c_paavo`
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