-- migrate:up transaction:false

-- Spatial index for urban_heat_building_f - Urban heat building data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_urban_heat_building_f_geom_gist
ON public.urban_heat_building_f USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_urban_heat_building_f_geom_gist;
