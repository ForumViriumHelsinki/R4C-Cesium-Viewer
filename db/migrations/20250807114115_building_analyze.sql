-- migrate:up

-- Update table statistics for better query planning
ANALYZE public.r4c_hsy_building_current;

-- migrate:down

-- No-op for rollback (ANALYZE is idempotent)
SELECT 1;
