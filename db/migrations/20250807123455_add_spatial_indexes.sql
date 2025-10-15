-- migrate:up transaction:false

-- Add missing spatial indexes for geometry-heavy tables
-- These indexes are critical for spatial queries and joins

-- 1. r4c_paavo - Statistical areas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_paavo_geom_gist
ON public.r4c_paavo USING gist (geom);

-- 2. r4c_coldspot - Cold spot analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_geom_gist
ON public.r4c_coldspot USING gist (geom);

-- 3. nature_area_f - Nature areas for environmental analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nature_area_f_geom_gist
ON public.nature_area_f USING gist (geom);

-- 4. other_nature_r4c - Other nature features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_other_nature_r4c_geom_gist
ON public.other_nature_r4c USING gist (geom);

-- 5. urban_heat_building_f - Urban heat building data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_urban_heat_building_f_geom_gist
ON public.urban_heat_building_f USING gist (geom);

-- 6. tree_building_distance - Tree-building relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_building_distance_geom_gist
ON public.tree_building_distance USING gist (geom);

-- 7. flood_f - Flood risk areas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flood_f_geom_gist
ON public.flood_f USING gist (geom);

-- 8. hki_travel_time_r4c_f - Travel time data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hki_travel_time_r4c_f_geom_gist
ON public.hki_travel_time_r4c_f USING gist (geom);

-- Additional composite indexes for common query patterns
-- Postal code + spatial queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_paavo_postinumero_geom
ON public.r4c_paavo (postinumeroalue) INCLUDE (geom);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_posno_geom
ON public.r4c_coldspot (posno) INCLUDE (geom);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nature_area_f_postinumero_geom
ON public.nature_area_f (postinumero) INCLUDE (geom);

-- Date-based queries for time series data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_date_geom
ON public.r4c_coldspot (date) INCLUDE (geom);

-- Update statistics for all affected tables
ANALYZE public.r4c_paavo;
ANALYZE public.r4c_coldspot;
ANALYZE public.nature_area_f;
ANALYZE public.other_nature_r4c;
ANALYZE public.urban_heat_building_f;
ANALYZE public.tree_building_distance;
ANALYZE public.flood_f;
ANALYZE public.hki_travel_time_r4c_f;

-- migrate:down transaction:false

-- Remove all spatial indexes added in the up migration
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_date_geom;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_nature_area_f_postinumero_geom;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_posno_geom;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_paavo_postinumero_geom;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_hki_travel_time_r4c_f_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_flood_f_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_building_distance_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_urban_heat_building_f_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_other_nature_r4c_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_nature_area_f_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_paavo_geom_gist;
