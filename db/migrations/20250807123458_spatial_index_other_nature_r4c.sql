-- migrate:up transaction:false

-- Spatial index for other_nature_r4c - Other nature features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_other_nature_r4c_geom_gist
ON public.other_nature_r4c USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_other_nature_r4c_geom_gist;
