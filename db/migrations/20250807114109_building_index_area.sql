-- migrate:up transaction:false

-- Index on area for filtering and sorting by building size
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_area_m2
ON public.r4c_hsy_building_current (area_m2);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_area_m2;
