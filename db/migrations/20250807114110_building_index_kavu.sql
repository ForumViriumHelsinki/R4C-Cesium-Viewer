-- migrate:up transaction:false

-- Index on construction year (kavu) for time-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_kavu
ON public.r4c_hsy_building_current (kavu);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_kavu;
