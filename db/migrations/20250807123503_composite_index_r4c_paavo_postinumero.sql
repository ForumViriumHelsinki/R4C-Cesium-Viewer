-- migrate:up transaction:false

-- Composite index: Postal code + spatial queries for r4c_paavo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_r4c_paavo_postinumero_geom
ON public.r4c_paavo (postinumeroalue) INCLUDE (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_r4c_paavo_postinumero_geom;
