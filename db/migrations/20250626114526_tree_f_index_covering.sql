-- migrate:up transaction:false

-- Covering index for the most common query pattern to enable index-only scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_covering
ON public.tree_f (postinumero, koodi)
INCLUDE (id, kuvaus, p_ala_m2, korkeus_ka_m);

-- migrate:down transaction:false

DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_covering;
