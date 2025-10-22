-- migrate:up transaction:false

-- Date-based queries for time series data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_date_geom
ON public.r4c_coldspot (date) INCLUDE (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_date_geom;
