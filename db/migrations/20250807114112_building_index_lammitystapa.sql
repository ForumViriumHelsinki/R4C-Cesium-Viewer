-- migrate:up transaction:false

-- Index on heating system (lammitystapa_s) for energy analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_lammitystapa_s
ON public.r4c_hsy_building_current (lammitystapa_s);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_lammitystapa_s;
