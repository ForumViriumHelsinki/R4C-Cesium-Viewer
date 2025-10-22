-- migrate:up transaction:false

-- Composite index: Postal code + spatial queries for nature_area_f
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nature_area_f_postinumero_geom
ON public.nature_area_f (postinumero) INCLUDE (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_nature_area_f_postinumero_geom;
