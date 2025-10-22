-- migrate:up transaction:false

-- Composite index for the most common query pattern: WHERE postinumero = X AND koodi = Y
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_postinumero_koodi
ON public.tree_f (postinumero, koodi);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_postinumero_koodi;
