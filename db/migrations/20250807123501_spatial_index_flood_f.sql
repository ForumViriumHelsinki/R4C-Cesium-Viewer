-- migrate:up transaction:false

-- Spatial index for flood_f - Flood risk areas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flood_f_geom_gist
ON public.flood_f USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_flood_f_geom_gist;
