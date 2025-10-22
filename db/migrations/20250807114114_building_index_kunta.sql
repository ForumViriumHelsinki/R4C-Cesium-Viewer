-- migrate:up transaction:false

-- Index on municipality for regional filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_kunta
ON public.r4c_hsy_building_current (kunta);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_kunta;
