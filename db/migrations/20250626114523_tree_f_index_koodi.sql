-- migrate:up transaction:false

-- Index on koodi for queries that only filter by tree code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_koodi
ON public.tree_f (koodi);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_koodi;
