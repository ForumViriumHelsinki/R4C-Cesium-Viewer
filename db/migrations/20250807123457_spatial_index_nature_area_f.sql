-- migrate:up transaction:false

-- Spatial index for nature_area_f - Nature areas for environmental analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nature_area_f_geom_gist
ON public.nature_area_f USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_nature_area_f_geom_gist;
