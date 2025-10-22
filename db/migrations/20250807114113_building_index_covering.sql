-- migrate:up transaction:false

-- Covering index for common query pattern - includes frequently selected columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_covering
ON public.r4c_hsy_building_current (posno, kayttarks)
INCLUDE (area_m2, kerala, kerrosten_lkm, asuntojen_lkm, kavu);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_covering;
