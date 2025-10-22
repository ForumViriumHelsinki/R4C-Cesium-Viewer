-- migrate:up

-- Update table statistics to help query planner make better decisions
ANALYZE public.tree_f;

-- migrate:down

-- No-op for rollback (ANALYZE is idempotent and doesn't need rollback)
SELECT 1;
