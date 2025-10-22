-- migrate:up transaction:false

-- Spatial index for geometry column (most critical for geospatial queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_geom_gist
ON public.r4c_hsy_building_current USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_geom_gist;
