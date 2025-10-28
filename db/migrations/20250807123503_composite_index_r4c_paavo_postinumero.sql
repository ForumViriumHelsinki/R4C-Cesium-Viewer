-- migrate:up transaction:false

-- B-tree index for postal code lookups on r4c_paavo
-- Note: Spatial queries use separate GIST index (idx_r4c_paavo_geom_gist)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_paavo_postinumero
ON public.r4c_paavo (postinumeroalue);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_paavo_postinumero;
