-- migrate:up transaction:false

-- Index on id column for ORDER BY performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_id
ON public.tree_f (id);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_id;
