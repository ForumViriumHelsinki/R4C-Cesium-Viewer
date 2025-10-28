-- migrate:up transaction:false

-- B-tree index for postal code lookups on nature_area_f
-- Note: Spatial queries use separate GIST index (idx_nature_area_f_geom_gist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nature_area_f_postinumero
ON public.nature_area_f (postinumero);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_nature_area_f_postinumero;
