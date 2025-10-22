-- migrate:up transaction:false

-- Spatial index for r4c_coldspot - Cold spot analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_geom_gist
ON public.r4c_coldspot USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_geom_gist;
