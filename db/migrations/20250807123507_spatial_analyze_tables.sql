-- migrate:up

-- Update statistics for all affected tables
ANALYZE public.r4c_paavo;
ANALYZE public.r4c_coldspot;
ANALYZE public.nature_area_f;
ANALYZE public.other_nature_r4c;
ANALYZE public.urban_heat_building_f;
ANALYZE public.tree_building_distance;
ANALYZE public.flood_f;
ANALYZE public.hki_travel_time_r4c_f;

-- migrate:down

-- No-op for rollback (ANALYZE is idempotent)
SELECT 1;
