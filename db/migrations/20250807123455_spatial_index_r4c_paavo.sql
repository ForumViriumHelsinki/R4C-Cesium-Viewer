-- migrate:up transaction:false

-- Spatial index for r4c_paavo - Statistical areas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_paavo_geom_gist
ON public.r4c_paavo USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_paavo_geom_gist;
