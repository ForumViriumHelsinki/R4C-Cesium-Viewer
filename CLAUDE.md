# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npx playwright test` - Run tests
- `skaffold dev --profile=local-with-services --port-forward` - Full local development with database
- `skaffold test -p migration-test` - Test database migrations

## Project Overview

Vue 3 climate data visualization application using CesiumJS for 3D geospatial mapping.

**Core Stack:** Vue 3, CesiumJS, Pinia, Vuetify, D3.js, Playwright

**Key Components:**
- Pinia stores for state management
- Services layer for data integration
- Multi-scale visualization (Capital Region → Building level)
- Heat exposure and socioeconomic data analysis

## Database Performance Optimizations

The project includes comprehensive database optimizations implemented via dbmate migrations:

**Performance Features:**
- Spatial indexes (GIST) for all geometry columns
- Composite indexes for common query patterns
- Covering indexes for index-only scans
- Materialized view management with automated refresh functions
- Query-specific optimizations for building and tree data

**New Migrations Added:**
- `20250626114521_optimize_tree_f_performance.sql` - Tree data query optimization
- `20250807114107_optimize_building_table_performance.sql` - Building table indexes
- `20250807123455_add_spatial_indexes.sql` - Spatial query optimization
- `20250807124619_setup_materialized_view_management.sql` - MV refresh automation
- `20250808064619_optimize_materialized_view_indexes.sql` - MV query optimization