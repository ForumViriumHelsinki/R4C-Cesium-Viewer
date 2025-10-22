-- migrate:up transaction:false

-- Index on postinumero for queries that only filter by postal code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_postinumero
ON public.tree_f (postinumero);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_postinumero;
