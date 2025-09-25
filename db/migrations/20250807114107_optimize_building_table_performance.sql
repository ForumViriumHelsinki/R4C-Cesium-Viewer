-- migrate:up

-- Performance optimization for r4c_hsy_building_current table
-- This table is heavily used for building queries and joins with heat data

-- 1. Spatial index for geometry column (most critical for geospatial queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_geom_gist 
ON public.r4c_hsy_building_current USING gist (geom);

-- 2. Composite index for common filter pattern: postal code + building usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_posno_kayttarks 
ON public.r4c_hsy_building_current (posno, kayttarks);

-- 3. Index on area for filtering and sorting by building size
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_area_m2 
ON public.r4c_hsy_building_current (area_m2);

-- 4. Index on construction year (kavu) for time-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_kavu 
ON public.r4c_hsy_building_current (kavu);

-- 5. Index on building material (rakennusaine_s) for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_rakennusaine_s 
ON public.r4c_hsy_building_current (rakennusaine_s);

-- 6. Index on heating system (lammitystapa_s) for energy analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_lammitystapa_s 
ON public.r4c_hsy_building_current (lammitystapa_s);

-- 7. Covering index for common query pattern - includes frequently selected columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_covering 
ON public.r4c_hsy_building_current (posno, kayttarks) 
INCLUDE (area_m2, kerala, kerrosten_lkm, asuntojen_lkm, kavu);

-- 8. Index on municipality for regional filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_kunta 
ON public.r4c_hsy_building_current (kunta);

-- Update table statistics for better query planning
ANALYZE public.r4c_hsy_building_current;

-- migrate:down

-- Remove the indexes created in the up migration
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_kunta;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_covering;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_lammitystapa_s;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_rakennusaine_s;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_kavu;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_area_m2;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_posno_kayttarks;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_geom_gist;