-- migrate:up transaction:false

-- Spatial index for tree_building_distance - Tree-building relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_building_distance_geom_gist
ON public.tree_building_distance USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_building_distance_geom_gist;
