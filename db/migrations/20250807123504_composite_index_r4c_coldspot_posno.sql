-- migrate:up transaction:false

-- B-tree index for postal code lookups on r4c_coldspot
-- Note: Spatial queries use separate GIST index (idx_r4c_coldspot_geom_gist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_coldspot_posno
ON public.r4c_coldspot (posno);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_coldspot_posno;
