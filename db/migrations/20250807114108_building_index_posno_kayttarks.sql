-- migrate:up transaction:false

-- Composite index for common filter pattern: postal code + building usage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_hsy_building_current_posno_kayttarks
ON public.r4c_hsy_building_current (posno, kayttarks);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_hsy_building_current_posno_kayttarks;
