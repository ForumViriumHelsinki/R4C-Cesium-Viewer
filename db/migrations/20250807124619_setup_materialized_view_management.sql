-- migrate:up

-- Materialized View Management Setup
-- This migration sets up procedures and functions for managing materialized views

-- 1. Function to refresh all materialized views
CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    view_name TEXT;
BEGIN
    -- Refresh each materialized view in dependency order

    -- First refresh the base materialized views
    RAISE NOTICE 'Refreshing r4c_hsy_building_mat...';
    REFRESH MATERIALIZED VIEW public.r4c_hsy_building_mat;

    RAISE NOTICE 'Refreshing r4c_postalcode_mat...';
    REFRESH MATERIALIZED VIEW public.r4c_postalcode_mat;

    RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$;

-- 2. Function to refresh a specific materialized view with error handling
CREATE OR REPLACE FUNCTION public.refresh_materialized_view_safely(view_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();

    RAISE NOTICE 'Starting refresh of materialized view: %', view_name;

    EXECUTE format('REFRESH MATERIALIZED VIEW %I', view_name);

    end_time := clock_timestamp();

    RAISE NOTICE 'Successfully refreshed % in %', view_name, (end_time - start_time);

    return TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to refresh materialized view %: %', view_name, SQLERRM;
    return FALSE;
END;
$$;

-- 3. Function to get materialized view statistics
CREATE OR REPLACE FUNCTION public.get_materialized_view_stats()
RETURNS TABLE(
    view_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    last_refreshed TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH mv_info AS (
        SELECT
            schemaname || '.' || matviewname as mv_name,
            schemaname,
            matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
    ),
    size_info AS (
        SELECT
            schemaname || '.' || tablename as table_name,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
        )
    )
    SELECT
        mv.mv_name::TEXT,
        (SELECT count(*)::BIGINT FROM r4c_hsy_building_mat) as row_count,
        COALESCE(si.size_bytes, 0)::BIGINT,
        CURRENT_TIMESTAMP as last_refreshed
    FROM mv_info mv
    LEFT JOIN size_info si ON mv.mv_name = si.table_name
    WHERE mv.matviewname = 'r4c_hsy_building_mat'

    UNION ALL

    SELECT
        mv.mv_name::TEXT,
        (SELECT count(*)::BIGINT FROM r4c_postalcode_mat) as row_count,
        COALESCE(si.size_bytes, 0)::BIGINT,
        CURRENT_TIMESTAMP as last_refreshed
    FROM mv_info mv
    LEFT JOIN size_info si ON mv.mv_name = si.table_name
    WHERE mv.matviewname = 'r4c_postalcode_mat';
END;
$$;

-- 4. Create a table to track materialized view refresh history
CREATE TABLE IF NOT EXISTS public.materialized_view_refresh_log (
    id SERIAL PRIMARY KEY,
    view_name TEXT NOT NULL,
    refresh_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refresh_completed_at TIMESTAMP,
    success BOOLEAN,
    error_message TEXT,
    rows_affected BIGINT,
    duration_seconds NUMERIC
);

-- 5. Enhanced refresh function with logging
CREATE OR REPLACE FUNCTION public.refresh_materialized_view_with_logging(view_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    log_id INTEGER;
    row_count BIGINT;
BEGIN
    start_time := clock_timestamp();

    -- Insert log entry
    INSERT INTO public.materialized_view_refresh_log (view_name, refresh_started_at)
    VALUES (view_name, start_time)
    RETURNING id INTO log_id;

    -- Refresh the materialized view
    EXECUTE format('REFRESH MATERIALIZED VIEW %I', view_name);

    -- Get row count
    EXECUTE format('SELECT count(*) FROM %I', view_name) INTO row_count;

    end_time := clock_timestamp();

    -- Update log entry with success
    UPDATE public.materialized_view_refresh_log
    SET
        refresh_completed_at = end_time,
        success = TRUE,
        rows_affected = row_count,
        duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))
    WHERE id = log_id;

    RAISE NOTICE 'Successfully refreshed % (%s rows) in %s seconds',
                 view_name, row_count, EXTRACT(EPOCH FROM (end_time - start_time));

    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();

    -- Update log entry with failure
    UPDATE public.materialized_view_refresh_log
    SET
        refresh_completed_at = end_time,
        success = FALSE,
        error_message = SQLERRM,
        duration_seconds = EXTRACT(EPOCH FROM (end_time - start_time))
    WHERE id = log_id;

    RAISE WARNING 'Failed to refresh materialized view %: %', view_name, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 6. Convenience function to refresh all views with logging
CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views_with_logging()
RETURNS TABLE(view_name TEXT, success BOOLEAN, duration_seconds NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH refresh_results AS (
        SELECT 'r4c_hsy_building_mat'::TEXT as mv_name,
               public.refresh_materialized_view_with_logging('r4c_hsy_building_mat') as success
        UNION ALL
        SELECT 'r4c_postalcode_mat'::TEXT as mv_name,
               public.refresh_materialized_view_with_logging('r4c_postalcode_mat') as success
    )
    SELECT
        rr.mv_name,
        rr.success,
        COALESCE(mvrl.duration_seconds, 0) as duration_seconds
    FROM refresh_results rr
    LEFT JOIN public.materialized_view_refresh_log mvrl ON (
        mvrl.view_name = rr.mv_name
        AND mvrl.refresh_started_at = (
            SELECT MAX(refresh_started_at)
            FROM public.materialized_view_refresh_log
            WHERE view_name = rr.mv_name
        )
    );
END;
$$;

-- Initialize the materialized views with data (if not already populated)
SELECT public.refresh_all_materialized_views_with_logging();

-- migrate:down

-- Drop logging functions and tables
DROP FUNCTION IF EXISTS public.refresh_all_materialized_views_with_logging();
DROP FUNCTION IF EXISTS public.refresh_materialized_view_with_logging(TEXT);
DROP TABLE IF EXISTS public.materialized_view_refresh_log;
DROP FUNCTION IF EXISTS public.get_materialized_view_stats();
DROP FUNCTION IF EXISTS public.refresh_materialized_view_safely(TEXT);
DROP FUNCTION IF EXISTS public.refresh_all_materialized_views();
