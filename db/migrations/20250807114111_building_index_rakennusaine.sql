-- migrate:up transaction:false

-- Index on building material (rakennusaine_s) for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_rakennusaine_s
ON public.r4c_hsy_building_current (rakennusaine_s);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_rakennusaine_s;
