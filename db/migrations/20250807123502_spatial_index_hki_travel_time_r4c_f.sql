-- migrate:up transaction:false

-- Spatial index for hki_travel_time_r4c_f - Travel time data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hki_travel_time_r4c_f_geom_gist
ON public.hki_travel_time_r4c_f USING gist (geom);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_hki_travel_time_r4c_f_geom_gist;
