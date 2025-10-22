-- migrate:up transaction:false

-- Composite index: Postal code + spatial queries for r4c_coldspot
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_posno_geom
ON public.r4c_coldspot (posno) INCLUDE (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_posno_geom;
