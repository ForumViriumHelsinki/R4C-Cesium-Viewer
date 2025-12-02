-- migrate:up

-- Optimize materialized view indexes
-- Ensure materialized views have proper indexes for fast querying
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) for migration compatibility
-- For production, consider running CONCURRENTLY indexes separately outside migrations

-- Note: These indexes already exist (created by the initial schema) but we ensure they are optimized
-- and add any missing ones for better performance

-- 1. Ensure r4c_hsy_building_mat has optimal indexes
-- The existing indexes are already good, but let's add some additional ones for common queries

-- Index for filtering by building characteristics
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_kayttarks
ON public.r4c_hsy_building_mat (kayttarks);

-- Index for building size filtering
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_area_m2
ON public.r4c_hsy_building_mat (area_m2);

-- Index for construction year
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_kavu
ON public.r4c_hsy_building_mat (kavu);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_composite
ON public.r4c_hsy_building_mat (postinumero, kayttarks, kavu);

-- 2. Ensure r4c_postalcode_mat has optimal indexes
-- Add index for heat exposure filtering
CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_avgheatexposure
ON public.r4c_postalcode_mat (avgheatexposure);

-- Add index for cold exposure filtering
CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_avgcoldexposure
ON public.r4c_postalcode_mat (avgcoldexposure);

-- Add index for helsinki urban heat data
CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_hki_avgheatexposure
ON public.r4c_postalcode_mat (hki_avgheatexposure);

-- Composite index for heat analysis queries
CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_heat_composite
ON public.r4c_postalcode_mat (postinumero, avgheatexposure, avgcoldexposure);

-- 3. Add additional performance-oriented indexes

-- Partial indexes for non-null values (more efficient for nullable columns)
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_heat_timeseries_notnull
ON public.r4c_hsy_building_mat (vtj_prt)
WHERE heat_timeseries IS NOT NULL AND heat_timeseries::text != '[]';

CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_cold_notnull
ON public.r4c_postalcode_mat (postinumero)
WHERE avgcoldexposure IS NOT NULL;

-- Functional indexes for common calculated fields
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_floor_area_ratio
ON public.r4c_hsy_building_mat ((kerala / NULLIF(area_m2, 0)));

-- GiST index for bounding box queries on materialized views
CREATE INDEX IF NOT EXISTS idx_r4c_hsy_building_mat_geom_box
ON public.r4c_hsy_building_mat USING gist (ST_Envelope(geom));

CREATE INDEX IF NOT EXISTS idx_r4c_postalcode_mat_geom_box
ON public.r4c_postalcode_mat USING gist (ST_Envelope(geom));

-- 4. Create statistics for better query planning
-- Drop existing statistics first to avoid conflicts
DROP STATISTICS IF EXISTS public.stat_r4c_hsy_building_mat_multi;
DROP STATISTICS IF EXISTS public.stat_r4c_postalcode_mat_multi;

CREATE STATISTICS stat_r4c_hsy_building_mat_multi
ON postinumero, kayttarks, area_m2, kavu
FROM public.r4c_hsy_building_mat;

CREATE STATISTICS stat_r4c_postalcode_mat_multi
ON postinumero, avgheatexposure, avgcoldexposure
FROM public.r4c_postalcode_mat;

-- Update statistics for all materialized views
ANALYZE public.r4c_hsy_building_mat;
ANALYZE public.r4c_postalcode_mat;

-- migrate:down

-- Remove additional statistics
DROP STATISTICS IF EXISTS public.stat_r4c_postalcode_mat_multi;
DROP STATISTICS IF EXISTS public.stat_r4c_hsy_building_mat_multi;

-- Remove additional indexes (keep the original ones from the initial schema)
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_geom_box;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_geom_box;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_floor_area_ratio;
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_cold_notnull;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_heat_timeseries_notnull;
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_heat_composite;
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_hki_avgheatexposure;
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_avgcoldexposure;
DROP INDEX IF EXISTS public.idx_r4c_postalcode_mat_avgheatexposure;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_composite;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_kavu;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_area_m2;
DROP INDEX IF EXISTS public.idx_r4c_hsy_building_mat_kayttarks;
