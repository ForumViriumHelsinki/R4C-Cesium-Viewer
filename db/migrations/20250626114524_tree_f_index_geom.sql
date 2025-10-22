-- migrate:up transaction:false

-- Spatial index for geometry column to speed up spatial queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_geom_gist
ON public.tree_f USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_geom_gist;
