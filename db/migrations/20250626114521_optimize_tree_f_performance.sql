-- migrate:up

-- Performance optimization for tree_f table
-- This migration adds indexes to improve query performance for common WHERE clauses

-- 1. Composite index for the most common query pattern: WHERE postinumero = X AND koodi = Y
-- This will dramatically speed up queries that filter by both postal code and tree code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_postinumero_koodi 
ON public.tree_f (postinumero, koodi);

-- 2. Individual index on postinumero for queries that only filter by postal code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_postinumero 
ON public.tree_f (postinumero);

-- 3. Individual index on koodi for queries that only filter by tree code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_koodi 
ON public.tree_f (koodi);

-- 4. Spatial index for geometry column to speed up spatial queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_geom_gist 
ON public.tree_f USING gist (geom);

-- 5. Index on id column for ORDER BY performance (if not already primary key)
-- Since id is used for ordering and pagination, this ensures fast sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_id 
ON public.tree_f (id);

-- 6. Covering index for the most common query pattern to avoid table lookups
-- This index includes the most frequently selected columns to enable index-only scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_f_covering 
ON public.tree_f (postinumero, koodi) 
INCLUDE (id, kuvaus, p_ala_m2, korkeus_ka_m);

-- Update table statistics to help query planner make better decisions
ANALYZE public.tree_f;

-- migrate:down

-- Remove the indexes created in the up migration
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_covering;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_geom_gist;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_koodi;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_postinumero;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tree_f_postinumero_koodi;