# R4C-Cesium-Viewer Development Justfile
# ========================================
# Unified entry point for local development workflows.
# Database data persists across restarts via Kubernetes PVC.
#
# Quick Start:
#   just dev       - Backend in K8s + local frontend (fast iteration)
#   just dev-full  - Everything in containers (slower, but closer to prod)

set dotenv-load
set positional-arguments

# ==============================================================================
# Configuration
# ==============================================================================

NAMESPACE := "regions4climate"
DB_HOST := env_var_or_default("DB_HOST", "localhost")
DB_PORT := env_var_or_default("DB_PORT", "5432")
DB_USER := env_var_or_default("DB_USER", "regions4climate_user")
DB_PASS := env_var_or_default("DB_PASS", "regions4climate_pass")
DB_NAME := env_var_or_default("DB_NAME", "regions4climate")
DB_ADMIN_USER := env_var_or_default("DB_ADMIN_USER", "postgres")
DB_ADMIN_PASS := env_var_or_default("DB_ADMIN_PASS", "postgres")
DB_WAIT_TIMEOUT := "120"
DB_WAIT_INTERVAL := "2"

# Seeding configuration
SEED_RECORDS := env_var_or_default("SEED_RECORDS", "100")
SEED_SCRIPT := "db/scripts/seed-dev-data.py"

# Paths
DUMP_DIR := "tmp/regions4climate-dir"
DUMP_FILE := "tmp/regions4climate.dump"
DUMP_SQL := "tmp/regions4climate-dump.sql"

# Mock API
MOCK_API_DIR := "mock-api"
MOCK_DENSITY := env_var_or_default("MOCK_DENSITY", "50")

# Test results
RESULTS_FILE := "test-results/test-results.json"
JUNIT_FILE := "test-results/junit.xml"

# Colors and symbols
GREEN := '\033[0;32m'
YELLOW := '\033[0;33m'
RED := '\033[0;31m'
CYAN := '\033[0;36m'
DIM := '\033[0;90m'
RESET := '\033[0m'
CHECK := GREEN + '✓' + RESET
CROSS := RED + '✗' + RESET
ARROW := CYAN + '→' + RESET

# ==============================================================================
# Metadata
# ==============================================================================

# Show available commands (default)
default: help

# Show available commands
help:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo -e "{{CYAN}}R4C-Cesium-Viewer Development{{RESET}}"
    echo ""
    echo -e "{{DIM}}Current Status:{{RESET}}"
    if pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        tables=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "?")
        rows=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc "SELECT COUNT(*) FROM r4c_hsy_building_current" 2>/dev/null || echo "0")
        rows=$(echo "$rows" | tr -d '[:space:]')
        if [ "$rows" = "0" ] || [ -z "$rows" ]; then
            echo -e "  Database:  {{YELLOW}}⚠{{RESET}} Connected ($tables tables, {{YELLOW}}NO DATA{{RESET}} - run 'just db-seed')"
        else
            echo -e "  Database:  {{CHECK}} Connected ($tables tables, $rows buildings)"
        fi
    else
        echo -e "  Database:  {{CROSS}} Not connected"
    fi
    if pgrep -f "vite" >/dev/null 2>&1; then
        echo -e "  Frontend:  {{CHECK}} Vite running (localhost:5173)"
    elif kubectl get pods -n {{NAMESPACE}} -l app=frontend --no-headers 2>/dev/null | grep -q Running; then
        echo -e "  Frontend:  {{CHECK}} Container running (localhost:4173)"
    else
        echo -e "  Frontend:  {{CROSS}} Not running"
    fi
    echo ""
    echo -e "{{DIM}}Quick Start:{{RESET}}"
    echo -e "  just dev         {{DIM}}- Backend in K8s + local frontend (prompts for data){{RESET}}"
    echo -e "  just dev --seed  {{DIM}}- Same, but auto-seeds without prompting{{RESET}}"
    echo -e "  just dev-full    {{DIM}}- Everything in containers{{RESET}}"
    echo ""
    echo -e "{{DIM}}All Commands:{{RESET}}"
    just --list --unsorted

# ==============================================================================
# Development
# ==============================================================================

# First-time setup (install dependencies, check tools)
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Checking required tools..."
    command -v skaffold >/dev/null || { echo -e "{{CROSS}} skaffold not found. Install: brew install skaffold"; exit 1; }
    command -v kubectl >/dev/null || { echo -e "{{CROSS}} kubectl not found. Install: brew install kubectl"; exit 1; }
    command -v bun >/dev/null || { echo -e "{{CROSS}} bun not found. Install: brew install oven-sh/bun/bun"; exit 1; }
    echo -e "{{CHECK}} All tools installed"
    echo ""
    echo -e "{{ARROW}} Installing dependencies..."
    bun install
    echo ""
    echo -e "{{CHECK}} Setup complete!"
    echo ""
    echo "Next steps:"
    echo -e "  just dev       {{DIM}}- Start development environment{{RESET}}"
    echo -e "  just db-seed   {{DIM}}- Seed database with test data{{RESET}}"

# Start services + local frontend (fast iteration)
# Flags: --seed, --continue, --import (for programmatic use)
dev *flags:
    #!/usr/bin/env bash
    set -euo pipefail

    # Parse flags
    action=""
    for arg in {{flags}}; do
        case "$arg" in
            --seed) action="seed" ;;
            --continue) action="continue" ;;
            --import) action="import" ;;
            *)
                echo -e "{{CROSS}} Unknown flag: $arg"
                echo -e "{{DIM}}Valid flags: --seed, --continue, --import{{RESET}}"
                exit 1
                ;;
        esac
    done

    echo -e "{{ARROW}} Starting backend services..."
    skaffold run -p services-only --port-forward &
    echo ""
    echo -e "{{ARROW}} Waiting for pods to be scheduled..."
    sleep 5
    echo -e "{{ARROW}} Waiting for database..."
    just db-wait
    echo ""
    echo -e "{{CHECK}} Backend ready!"
    echo ""

    # Show database stats
    just _db-show-stats
    echo ""

    # Determine action
    if [ -z "$action" ]; then
        # Interactive prompt
        just _db-prompt-action
    else
        # Flag-based action
        case "$action" in
            seed)
                echo -e "{{ARROW}} Seeding database (--seed flag)..."
                just db-seed
                ;;
            import)
                echo -e "{{ARROW}} Importing database (--import flag)..."
                just db-import
                ;;
            continue)
                echo -e "{{CHECK}} Continuing with existing data (--continue flag)"
                ;;
        esac
    fi

    echo ""
    echo -e "{{ARROW}} Starting local frontend (Ctrl+C to stop)..."
    echo -e "{{DIM}}Frontend: http://localhost:5173{{RESET}}"
    echo -e "{{DIM}}PyGeoAPI: http://localhost:5000{{RESET}}"
    echo ""
    bun run dev

# Start everything in Skaffold containers (services persist)
dev-full:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Starting backend services (will persist on stop)..."
    skaffold run -p services-only --port-forward &
    echo ""
    echo -e "{{ARROW}} Waiting for services to be ready..."
    just db-wait
    echo ""
    echo -e "{{CHECK}} Backend ready!"
    echo ""
    echo -e "{{ARROW}} Starting frontend container (Ctrl+C to stop frontend only)..."
    echo -e "{{DIM}}Frontend: http://localhost:4173{{RESET}}"
    echo -e "{{DIM}}PyGeoAPI: http://localhost:5000{{RESET}}"
    echo ""
    skaffold dev -p frontend-only --port-forward

# Production build
build:
    bun run build

# Clean build artifacts
clean:
    rm -rf dist node_modules/.vite .playwright-cache
    echo -e "{{CHECK}} Build artifacts cleaned"

# Stop all services
stop:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Stopping services..."
    skaffold delete -p frontend-only 2>/dev/null || true
    skaffold delete -p services-only 2>/dev/null || true
    skaffold delete 2>/dev/null || true
    echo -e "{{CHECK}} Services stopped"
    echo -e "{{DIM}}Note: Database data preserved in PVC. Use 'just db-reset' to wipe.{{RESET}}"

# Stop frontend only (keep services running)
stop-frontend:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Stopping frontend..."
    skaffold delete -p frontend-only 2>/dev/null || true
    echo -e "{{CHECK}} Frontend stopped (services still running)"

# Show current environment status
status:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo -e "{{CYAN}}=== Kubernetes Pods ==={{RESET}}"
    kubectl get pods -n {{NAMESPACE}} 2>/dev/null || echo -e "{{DIM}}No pods running{{RESET}}"
    echo ""
    echo -e "{{CYAN}}=== PVC Status (database persistence) ==={{RESET}}"
    kubectl get pvc -n {{NAMESPACE}} 2>/dev/null || echo -e "{{DIM}}No PVCs{{RESET}}"
    echo ""
    echo -e "{{CYAN}}=== Port Forwards ==={{RESET}}"
    ps aux | grep -E "kubectl.*port-forward" | grep -v grep | awk '{print "  " $0}' || echo -e "{{DIM}}None active{{RESET}}"
    echo ""

# Tail logs from all services
logs:
    kubectl logs -f -l app -n {{NAMESPACE}} --prefix --all-containers 2>/dev/null || \
        echo -e "{{CROSS}} No pods running. Start with: just dev"

# ==============================================================================
# Code Quality
# ==============================================================================

# Run linter (read-only)
lint *args:
    bun run lint {{ args }}

# Auto-fix lint issues
lint-fix:
    bun run lint --fix

# Format code (mutating)
format:
    bun run lint --write

# Verify formatting (non-mutating)
format-check:
    bun run lint

# Run TypeScript type checking
typecheck:
    bunx vue-tsc --noEmit

# Code quality gate (non-mutating, no tests)
check: format-check lint typecheck

# ==============================================================================
# Testing
# ==============================================================================

# Run all tests
test *args:
    bun run test:all {{ args }}

# Run unit tests only (fast)
test-unit *args:
    bun run test:unit {{ args }}

# Run end-to-end tests (requires VITE_E2E_TEST=true for Cesium viewer exposure)
test-e2e *args:
    VITE_E2E_TEST=true bun run test:e2e {{ args }}

# ==============================================================================
# Workflows
# ==============================================================================

# Fast non-mutating checks before commit
pre-commit: format-check lint typecheck test-unit

# Full CI simulation
ci: check test build

# ==============================================================================
# Database
# ==============================================================================

# Internal: Show database statistics (called by dev)
_db-show-stats:
    #!/usr/bin/env bash
    echo -e "{{CYAN}}=== Database Status ==={{RESET}}"

    # Query row counts for key tables
    buildings=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
        "SELECT COUNT(*) FROM r4c_hsy_building_current;" 2>/dev/null || echo "0")
    trees=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
        "SELECT COUNT(*) FROM r4c_hsy_tree_f;" 2>/dev/null || echo "0")
    heat=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
        "SELECT COUNT(*) FROM r4c_bld_hki_hlvrm;" 2>/dev/null || echo "0")
    postal=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
        "SELECT COUNT(*) FROM r4c_pno_alue;" 2>/dev/null || echo "0")

    # Clean up whitespace
    buildings=$(echo "$buildings" | tr -d '[:space:]')
    trees=$(echo "$trees" | tr -d '[:space:]')
    heat=$(echo "$heat" | tr -d '[:space:]')
    postal=$(echo "$postal" | tr -d '[:space:]')

    # Format numbers with commas
    fmt_buildings=$(printf "%'d" "$buildings" 2>/dev/null || echo "$buildings")
    fmt_trees=$(printf "%'d" "$trees" 2>/dev/null || echo "$trees")
    fmt_heat=$(printf "%'d" "$heat" 2>/dev/null || echo "$heat")
    fmt_postal=$(printf "%'d" "$postal" 2>/dev/null || echo "$postal")

    echo -e "  Buildings:      $fmt_buildings rows"
    echo -e "  Trees:          $fmt_trees rows"
    echo -e "  Heat data:      $fmt_heat rows"
    echo -e "  Postal codes:   $fmt_postal rows"
    echo ""

    # Detect data type by checking vtj_prt pattern
    if [ "$buildings" = "0" ] || [ -z "$buildings" ]; then
        echo -e "  Data type: {{YELLOW}}NO DATA{{RESET}}"
    else
        sample_id=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
            "SELECT vtj_prt FROM r4c_hsy_building_current LIMIT 1;" 2>/dev/null || echo "")
        sample_id=$(echo "$sample_id" | tr -d '[:space:]')
        if [[ "$sample_id" == BUILD_* ]]; then
            echo -e "  Data type: {{GREEN}}SYNTHETIC{{RESET}} (vtj_prt pattern: BUILD_*)"
        elif [ -n "$sample_id" ]; then
            echo -e "  Data type: {{CYAN}}PRODUCTION{{RESET}} (vtj_prt: ${sample_id:0:20}...)"
        else
            echo -e "  Data type: {{YELLOW}}UNKNOWN{{RESET}}"
        fi
    fi

# Internal: Interactive prompt for data source (called by dev)
_db-prompt-action:
    #!/usr/bin/env bash
    # Check if database has data
    buildings=$(PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -tAc \
        "SELECT COUNT(*) FROM r4c_hsy_building_current;" 2>/dev/null || echo "0")
    buildings=$(echo "$buildings" | tr -d '[:space:]')

    echo ""
    echo -e "{{CYAN}}Choose data source:{{RESET}}"
    if [ "$buildings" = "0" ] || [ -z "$buildings" ]; then
        echo -e "  {{GREEN}}[s]{{RESET}} Seed synthetic data (~1 min) {{GREEN}}(Recommended){{RESET}}"
        echo -e "  {{DIM}}[i]{{RESET}} Import production dump (~15-30 min)"
        default_choice="s"
    else
        echo -e "  {{DIM}}[s]{{RESET}} Seed synthetic data (~1 min)"
        echo -e "  {{DIM}}[i]{{RESET}} Import production dump (~15-30 min)"
        echo -e "  {{GREEN}}[c]{{RESET}} Continue with current data {{GREEN}}(Recommended){{RESET}}"
        default_choice="c"
    fi
    echo ""
    read -p "Enter choice [s/i/c]: " choice
    choice=${choice:-$default_choice}
    echo ""

    case "$choice" in
        s|S)
            just db-seed
            ;;
        i|I)
            just db-import
            ;;
        c|C)
            echo -e "{{CHECK}} Continuing with existing data"
            ;;
        *)
            echo -e "{{YELLOW}}Invalid choice, continuing with existing data{{RESET}}"
            ;;
    esac

# Wait for database to be ready
db-wait:
    #!/usr/bin/env bash
    set -euo pipefail
    elapsed=0
    while [ $elapsed -lt {{DB_WAIT_TIMEOUT}} ]; do
        if pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
            echo -e "{{CHECK}} Database ready ($elapsed seconds)"
            exit 0
        fi
        printf "\r  {{DIM}}Waiting for database... %ds / {{DB_WAIT_TIMEOUT}}s{{RESET}}" $elapsed
        sleep {{DB_WAIT_INTERVAL}}
        elapsed=$((elapsed + {{DB_WAIT_INTERVAL}}))
    done
    echo ""
    echo -e "{{CROSS}} Database connection timeout after {{DB_WAIT_TIMEOUT}}s"
    echo -e "{{DIM}}Debug: kubectl logs postgresql-0 -n {{NAMESPACE}}{{RESET}}"
    exit 1

# Show database connection info and stats
db-status:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Database Status ==={{RESET}}"
    if pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        echo -e "{{CHECK}} Connected to {{DB_HOST}}:{{DB_PORT}}"
        echo ""
        echo -e "{{DIM}}Tables:{{RESET}}"
        PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} \
            -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null
        echo ""
        echo -e "{{DIM}}Database size:{{RESET}}"
        PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} \
            -c "SELECT pg_size_pretty(pg_database_size('{{DB_NAME}}')) as size;" 2>/dev/null
    else
        echo -e "{{CROSS}} Not connected"
        echo -e "{{DIM}}Start services with: just dev{{RESET}}"
    fi

# Run database migrations manually
db-migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Running migrations..."
    if [ -f ./scripts/init-local-db.sh ]; then
        ./scripts/init-local-db.sh
    else
        DATABASE_URL="postgres://{{DB_USER}}:{{DB_PASS}}@{{DB_HOST}}:{{DB_PORT}}/{{DB_NAME}}?sslmode=disable" dbmate up
    fi
    echo -e "{{CHECK}} Migrations complete"

# Seed database with test data (recommended for local dev)
db-seed:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Database Seeding ==={{RESET}}"
    echo ""
    echo -e "{{DIM}}This is the recommended approach for local development.{{RESET}}"
    echo -e "{{DIM}}Seeding takes ~30-60 seconds vs 15-30 minutes for production import.{{RESET}}"
    echo ""
    # Start database if not running
    if ! pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        echo -e "{{ARROW}} Database not running, starting services..."
        skaffold run -p services-only --port-forward &
        sleep 5
        just db-wait
        echo ""
    fi
    echo -e "{{ARROW}} Seeding database with {{SEED_RECORDS}} records per table..."
    if [ ! -f "{{SEED_SCRIPT}}" ]; then
        echo -e "{{CROSS}} Seed script not found: {{SEED_SCRIPT}}"
        exit 1
    fi
    DATABASE_URL="postgres://{{DB_USER}}:{{DB_PASS}}@{{DB_HOST}}:{{DB_PORT}}/{{DB_NAME}}" \
        python3 {{SEED_SCRIPT}} --num-records {{SEED_RECORDS}}
    echo ""
    echo -e "{{CHECK}} Seeding complete!"
    echo ""
    echo -e "{{DIM}}Verify with: just db-status{{RESET}}"
    echo -e "{{DIM}}Test API:    curl http://localhost:5000/collections{{RESET}}"

# Clear existing data and seed fresh
db-seed-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Database Seeding (Clean) ==={{RESET}}"
    echo ""
    echo -e "{{YELLOW}}This will clear existing data before seeding.{{RESET}}"
    echo ""
    # Start database if not running
    if ! pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        echo -e "{{ARROW}} Database not running, starting services..."
        skaffold run -p services-only --port-forward &
        sleep 5
        just db-wait
        echo ""
    fi
    echo -e "{{ARROW}} Clearing and seeding database with {{SEED_RECORDS}} records per table..."
    DATABASE_URL="postgres://{{DB_USER}}:{{DB_PASS}}@{{DB_HOST}}:{{DB_PORT}}/{{DB_NAME}}" \
        python3 {{SEED_SCRIPT}} --clear-first --num-records {{SEED_RECORDS}}
    echo ""
    echo -e "{{CHECK}} Seeding complete!"

# Import production database from tmp/ (auto-detects format)
db-import:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Database Import ==={{RESET}}"
    echo ""
    echo -e "{{YELLOW}}Note: For local development, consider using 'just db-seed' instead.{{RESET}}"
    echo -e "{{YELLOW}}Seeding takes ~30-60 seconds vs 15-30 minutes for production import.{{RESET}}"
    echo ""
    # Start database if not running
    if ! pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        echo -e "{{ARROW}} Database not running, starting services..."
        skaffold run -p services-only --port-forward &
        sleep 5
        just db-wait
        echo ""
    fi
    # Detect dump format (prefer directory > custom > SQL)
    dump_path=""
    dump_type=""
    if [ -d "{{DUMP_DIR}}" ]; then
        dump_path="{{DUMP_DIR}}"
        dump_type="directory"
        size=$(du -sh "{{DUMP_DIR}}" | cut -f1)
        echo -e "{{CHECK}} Found directory format dump: {{DUMP_DIR}}"
        echo -e "{{DIM}}  Size: $size (best performance with parallel restore){{RESET}}"
    elif [ -f "{{DUMP_FILE}}" ]; then
        dump_path="{{DUMP_FILE}}"
        dump_type="custom"
        size=$(du -h "{{DUMP_FILE}}" | cut -f1)
        echo -e "{{CHECK}} Found custom format dump: {{DUMP_FILE}}"
        echo -e "{{DIM}}  Size: $size (supports parallel restore){{RESET}}"
    elif [ -f "{{DUMP_SQL}}" ]; then
        dump_path="{{DUMP_SQL}}"
        dump_type="sql"
        size=$(du -h "{{DUMP_SQL}}" | cut -f1)
        echo -e "{{CHECK}} Found SQL dump: {{DUMP_SQL}}"
        echo -e "{{DIM}}  Size: $size (slower, no parallel support){{RESET}}"
    else
        echo -e "{{CROSS}} No dump file found in tmp/"
        echo ""
        echo -e "{{DIM}}Expected one of:{{RESET}}"
        echo -e "{{DIM}}  - {{DUMP_DIR}}/ (directory format, recommended){{RESET}}"
        echo -e "{{DIM}}  - {{DUMP_FILE}} (custom format){{RESET}}"
        echo -e "{{DIM}}  - {{DUMP_SQL}} (plain SQL){{RESET}}"
        echo ""
        echo -e "{{DIM}}To export from Cloud SQL:{{RESET}}"
        echo -e "{{DIM}}  just help-db-export{{RESET}}"
        echo ""
        echo -e "{{GREEN}}Or use seeding instead (recommended):{{RESET}}"
        echo -e "{{GREEN}}  just db-seed{{RESET}}"
        exit 1
    fi
    echo ""
    echo -e "{{YELLOW}}WARNING: This will import data into the current database!{{RESET}}"
    echo -e "{{DIM}}Database: {{DB_HOST}}:{{DB_PORT}}/{{DB_NAME}}{{RESET}}"
    echo -e "{{DIM}}Some 'already exists' errors are expected (non-fatal){{RESET}}"
    echo -e "{{DIM}}Estimated time: 15-30 minutes for 18GB{{RESET}}"
    echo ""
    read -p "Continue? [y/N] " confirm
    [ "$confirm" = "y" ] || exit 1
    echo ""
    echo -e "{{ARROW}} Starting import..."
    start_time=$(date +%s)
    if [ "$dump_type" = "directory" ] || [ "$dump_type" = "custom" ]; then
        echo -e "{{DIM}}Using parallel restore (4 jobs){{RESET}}"
        PGPASSWORD={{DB_ADMIN_PASS}} pg_restore \
            -h {{DB_HOST}} -p {{DB_PORT}} \
            -U {{DB_ADMIN_USER}} \
            -d {{DB_NAME}} \
            --no-owner \
            --no-acl \
            --jobs=4 \
            --verbose \
            "$dump_path" 2>&1 | \
            while IFS= read -r line; do
                case "$line" in
                    *"processing data for table"*|*"finished item"*|*"launching item"*)
                        table=$(echo "$line" | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/public.//')
                        elapsed=$(($(date +%s) - start_time))
                        printf "\r{{DIM}}[%dm %ds] Processing: $table{{RESET}}                    " $((elapsed/60)) $((elapsed%60))
                        ;;
                esac
            done
    elif [ "$dump_type" = "sql" ]; then
        echo -e "{{DIM}}Using psql (no parallelization available for SQL dumps){{RESET}}"
        if command -v pv >/dev/null 2>&1; then
            pv -pterb "$dump_path" | PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -q
        else
            echo -e "{{DIM}}Tip: Install 'pv' for progress (brew install pv){{RESET}}"
            PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}} -q < "$dump_path"
        fi
    fi
    elapsed=$(($(date +%s) - start_time))
    echo ""
    echo -e "{{CHECK}} Import complete in $((elapsed/60))m $((elapsed%60))s"
    echo ""
    echo -e "{{DIM}}Verify tables:{{RESET}} just db-status"

# Show how to export database from Cloud SQL
help-db-export:
    #!/usr/bin/env bash
    echo -e "{{CYAN}}=== Export from Cloud SQL ==={{RESET}}"
    echo ""
    echo -e "{{DIM}}# Option 1: Directory Format (Recommended - fastest, parallel){{RESET}}"
    echo "cloud-sql-proxy --auto-iam-authn fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &"
    echo 'pg_dump -h 127.0.0.1 -p 5433 -U $(gcloud config get-value account) -d regions4climate \'
    echo "  --format=directory --no-owner --no-acl --jobs=4 -f tmp/regions4climate-dir"
    echo "pkill cloud-sql-proxy"
    echo ""
    echo -e "{{DIM}}# Option 2: Custom Format (Good - parallel restore){{RESET}}"
    echo "cloud-sql-proxy --auto-iam-authn fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &"
    echo 'pg_dump -h 127.0.0.1 -p 5433 -U $(gcloud config get-value account) -d regions4climate \'
    echo "  --format=custom --no-owner --no-acl --compress=6 -f tmp/regions4climate.dump"
    echo "pkill cloud-sql-proxy"
    echo ""
    echo -e "{{DIM}}See docs/DATABASE_IMPORT.md for full details{{RESET}}"

# Open psql shell
db-shell:
    #!/usr/bin/env bash
    set -euo pipefail
    # Start database if not running
    if ! pg_isready -h {{DB_HOST}} -p {{DB_PORT}} -q 2>/dev/null; then
        echo -e "{{ARROW}} Database not running, starting services..."
        skaffold run -p services-only --port-forward &
        sleep 5
        just db-wait
        echo ""
    fi
    echo -e "{{ARROW}} Connecting to database..."
    PGPASSWORD={{DB_ADMIN_PASS}} psql -h {{DB_HOST}} -p {{DB_PORT}} -U {{DB_ADMIN_USER}} -d {{DB_NAME}}

# WARNING: Delete database and start fresh
db-reset:
    #!/usr/bin/env bash
    set -euo pipefail
    echo ""
    echo -e "{{RED}}WARNING: This will DELETE ALL DATABASE DATA!{{RESET}}"
    echo ""
    echo "The PVC 'postgresql-data' will be removed."
    echo "You will need to re-import or re-seed the database."
    echo ""
    read -p "Type 'DELETE' to confirm: " confirm
    [ "$confirm" = "DELETE" ] || { echo "Aborted."; exit 1; }
    echo ""
    echo -e "{{ARROW}} Stopping services..."
    skaffold delete -p services-only 2>/dev/null || true
    skaffold delete 2>/dev/null || true
    echo -e "{{ARROW}} Deleting PVC..."
    kubectl delete pvc postgresql-data -n {{NAMESPACE}} --ignore-not-found
    echo ""
    echo -e "{{CHECK}} Database reset complete"
    echo -e "{{DIM}}Run 'just dev' to recreate, then 'just db-seed' to populate with test data{{RESET}}"

# ==============================================================================
# Mock API (No Database Required)
# ==============================================================================

# Start mock PyGeoAPI server (no database needed)
mock-api: mock-generate
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Starting mock PyGeoAPI server..."
    echo -e "{{DIM}}Serves synthetic data from mock-api/fixtures/{{RESET}}"
    echo ""
    cd {{MOCK_API_DIR}} && bun run dev

# Generate mock GeoJSON fixtures
mock-generate:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Mock Data Generator ==={{RESET}}"
    echo ""
    if [ ! -d "{{MOCK_API_DIR}}/fixtures" ] || [ -z "$(ls -A {{MOCK_API_DIR}}/fixtures 2>/dev/null)" ]; then
        echo -e "{{ARROW}} Generating fixtures ({{MOCK_DENSITY}} buildings per postal code)..."
        cd {{MOCK_API_DIR}} && bun install --silent && bun run generate --density {{MOCK_DENSITY}}
    else
        echo -e "{{CHECK}} Fixtures already exist in {{MOCK_API_DIR}}/fixtures/"
        echo -e "{{DIM}}To regenerate: rm -rf {{MOCK_API_DIR}}/fixtures && just mock-generate{{RESET}}"
    fi

# Stop mock API server
mock-stop:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{ARROW}} Stopping mock API..."
    pkill -f "bun.*server.ts" 2>/dev/null || true
    echo -e "{{CHECK}} Mock API stopped"

# Start frontend with mock API (no database/K8s needed)
dev-mock:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Development with Mock API ==={{RESET}}"
    echo ""
    echo -e "{{DIM}}This mode uses synthetic data - no database or Kubernetes required.{{RESET}}"
    echo -e "{{DIM}}Perfect for frontend development and testing.{{RESET}}"
    echo ""
    # Ensure fixtures exist
    just mock-generate
    echo ""
    echo -e "{{ARROW}} Starting mock API in background..."
    cd {{MOCK_API_DIR}} && bun run start &
    sleep 2
    echo -e "{{CHECK}} Mock API running on http://localhost:5050"
    echo ""
    echo -e "{{ARROW}} Starting frontend..."
    echo -e "{{DIM}}Frontend: http://localhost:5173{{RESET}}"
    echo -e "{{DIM}}Mock API: http://localhost:5050{{RESET}}"
    echo ""
    bun run dev || (just mock-stop && exit 1)
    # Stop mock API when frontend exits
    just mock-stop

# ==============================================================================
# AI-Assisted Development
# ==============================================================================

# Launch Claude to monitor console errors and fix them in real-time
dev-autofix:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== AI-Assisted Development Mode ==={{RESET}}"
    echo ""
    echo -e "{{DIM}}This mode launches Claude Code to:{{RESET}}"
    echo -e "{{DIM}}  1. Start the dev server in background{{RESET}}"
    echo -e "{{DIM}}  2. Connect to Chrome DevTools MCP{{RESET}}"
    echo -e "{{DIM}}  3. Monitor console for errors/warnings{{RESET}}"
    echo -e "{{DIM}}  4. Fix issues automatically as you browse{{RESET}}"
    echo ""
    echo -e "{{YELLOW}}Prerequisites:{{RESET}}"
    echo -e "  - Chrome running with remote debugging (see just chrome-debug){{RESET}}"
    echo -e "  - Chrome DevTools MCP server configured{{RESET}}"
    echo ""
    # Check if Chrome DevTools MCP is likely configured
    if ! grep -q "chrome-devtools" ~/.claude/mcp.json 2>/dev/null && \
       ! grep -q "chrome-devtools" .mcp.json 2>/dev/null; then
        echo -e "{{YELLOW}}⚠ Chrome DevTools MCP may not be configured{{RESET}}"
        echo -e "{{DIM}}Add to your MCP config or run: just chrome-debug{{RESET}}"
        echo ""
    fi
    echo -e "{{ARROW}} Launching Claude Code with dev-autofix workflow..."
    echo ""
    # Launch Claude with the monitoring prompt
    claude "Start the development workflow: \
    1. Run 'bun dev' in background using the Bash tool with run_in_background=true \
    2. Wait 3 seconds for the server to start \
    3. Use Chrome DevTools MCP to navigate to http://localhost:5173 \
    4. Monitor the console for errors and warnings by periodically checking list_console_messages with types=['error', 'warn'] \
    5. When you find issues, investigate and fix them in the code \
    6. After fixing, reload the page and continue monitoring \
    7. Keep monitoring until I say stop - check every 10-15 seconds for new errors \
    \
    Start now by running bun dev in background."

# Launch Chrome with remote debugging for DevTools MCP
chrome-debug:
    #!/usr/bin/env bash
    set -euo pipefail
    echo -e "{{CYAN}}=== Chrome Remote Debugging ==={{RESET}}"
    echo ""
    # Check if Chrome is already running with debugging
    if lsof -i :9222 >/dev/null 2>&1; then
        echo -e "{{CHECK}} Chrome already running with remote debugging on port 9222"
        exit 0
    fi
    echo -e "{{ARROW}} Launching Chrome with remote debugging..."
    # macOS Chrome path
    if [ -d "/Applications/Google Chrome.app" ]; then
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
            --remote-debugging-port=9222 \
            --user-data-dir="/tmp/chrome-debug-profile" \
            "about:blank" &
        sleep 2
        echo -e "{{CHECK}} Chrome launched with remote debugging on port 9222"
        echo -e "{{DIM}}Profile: /tmp/chrome-debug-profile{{RESET}}"
    else
        echo -e "{{CROSS}} Chrome not found at /Applications/Google Chrome.app"
        echo -e "{{DIM}}Please launch Chrome manually with: --remote-debugging-port=9222{{RESET}}"
        exit 1
    fi

# ==============================================================================
# Test Analysis
# ==============================================================================

# Show test pass/fail/skip summary from Playwright JSON report
[group: "test analysis"]
test-results-summary results_file=RESULTS_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{results_file}}" ]; then
        echo -e "{{CROSS}} Results file not found: {{results_file}}"
        echo -e "{{DIM}}Run tests first: just test-e2e --reporter=json{{RESET}}"
        exit 1
    fi
    echo -e "{{CYAN}}=== Test Results Summary ==={{RESET}}"
    echo ""
    jq -r '
      .stats |
      "  Expected (pass): \(.expected)\n  Unexpected (fail): \(.unexpected)\n  Skipped:           \(.skipped)\n  Flaky:             \(.flaky)\n  Total:             \(.expected + .unexpected + .skipped + .flaky)\n  Duration:          \(.duration / 1000 | floor)s (\(.duration / 60000 | floor)m \(.duration / 1000 % 60 | floor)s)\n  Pass rate:         \(if (.expected + .unexpected) > 0 then ((.expected * 100) / (.expected + .unexpected) | floor) else 0 end)%"
    ' "{{results_file}}"
    echo ""

# Group test failures by error pattern
[group: "test analysis"]
test-results-failures results_file=RESULTS_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{results_file}}" ]; then
        echo -e "{{CROSS}} Results file not found: {{results_file}}"
        echo -e "{{DIM}}Run tests first: just test-e2e --reporter=json{{RESET}}"
        exit 1
    fi
    echo -e "{{CYAN}}=== Failures by Error Pattern ==={{RESET}}"
    echo ""
    jq -r '
      # Collect all failure records with context
      [.. | objects | select(.specs?) | .specs[] | select(.ok == false) |
        . as $spec |
        .tests[] | select(.status == "unexpected") |
        {
          title: $spec.title,
          browser: .projectName,
          error: (.results[0].error.message // "unknown")
        }
      ] |
      # Classify each error
      map(
        .pattern = (
          if (.error | test("waitForFunction")) then "waitForFunction timeout"
          elif (.error | test("toBeVisible")) then "toBeVisible assertion"
          elif (.error | test("locator\\.click|click.*timeout"; "i")) then "locator.click timeout"
          elif (.error | test("toHaveLength")) then "toHaveLength assertion"
          elif (.error | test("page\\.goto|navigation.*timeout"; "i")) then "page.goto timeout"
          else "other"
          end
        )
      ) |
      # Group by pattern
      group_by(.pattern) |
      sort_by(-length) |
      .[] |
      "\u001b[0;33m\(.[0].pattern)\u001b[0m (\(length) failures)" ,
      (
        group_by(.title) |
        sort_by(-length) |
        .[] |
        "  \(.[0].title)  \u001b[0;90m[\(map(.browser) | unique | join(", "))]\u001b[0m"
      ),
      ""
    ' "{{results_file}}"

# Group test failures by source file
[group: "test analysis"]
test-results-by-file results_file=RESULTS_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{results_file}}" ]; then
        echo -e "{{CROSS}} Results file not found: {{results_file}}"
        echo -e "{{DIM}}Run tests first: just test-e2e --reporter=json{{RESET}}"
        exit 1
    fi
    echo -e "{{CYAN}}=== Failures by Source File ==={{RESET}}"
    echo ""
    jq -r '
      [.. | objects | select(.specs?) | .specs[] | select(.ok == false) |
        . as $spec |
        .tests[] | select(.status == "unexpected") |
        {
          title: $spec.title,
          browser: .projectName,
          file: (.results[0].error.location.file // "unknown"),
          line: (.results[0].error.location.line // 0)
        }
      ] |
      group_by(.file) |
      sort_by(-length) |
      .[] |
      "\u001b[0;36m\(.[0].file)\u001b[0m (\(length) failures)",
      (
        group_by(.title) |
        sort_by(-length) |
        .[] |
        "  L\(.[0].line): \(.[0].title)  \u001b[0;90m[\(map(.browser) | unique | join(", "))]\u001b[0m"
      ),
      ""
    ' "{{results_file}}"

# Group test failures by browser project
[group: "test analysis"]
test-results-by-browser results_file=RESULTS_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{results_file}}" ]; then
        echo -e "{{CROSS}} Results file not found: {{results_file}}"
        echo -e "{{DIM}}Run tests first: just test-e2e --reporter=json{{RESET}}"
        exit 1
    fi
    echo -e "{{CYAN}}=== Failures by Browser ==={{RESET}}"
    echo ""
    jq -r '
      [.. | objects | select(.specs?) | .specs[] | select(.ok == false) |
        . as $spec |
        .tests[] | select(.status == "unexpected") |
        {
          title: $spec.title,
          browser: .projectName,
          file: (.results[0].error.location.file // "unknown"),
          line: (.results[0].error.location.line // 0)
        }
      ] |
      group_by(.browser) |
      sort_by(-length) |
      .[] |
      "\u001b[0;33m\(.[0].browser)\u001b[0m (\(length) failures)",
      (
        sort_by(.file, .title) |
        if length > 10 then
          (.[:10] | .[] | "  \(.file):\(.line) \(.title)"),
          "  \u001b[0;90m... and \(length - 10) more\u001b[0m"
        else
          .[] | "  \(.file):\(.line) \(.title)"
        end
      ),
      ""
    ' "{{results_file}}"

# Generate GitHub issue drafts grouped by (file, error pattern)
[group: "test analysis"]
test-results-issues results_file=RESULTS_FILE:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f "{{results_file}}" ]; then
        echo -e "{{CROSS}} Results file not found: {{results_file}}"
        echo -e "{{DIM}}Run tests first: just test-e2e --reporter=json{{RESET}}"
        exit 1
    fi
    echo -e "{{CYAN}}=== GitHub Issue Drafts ==={{RESET}}"
    echo ""
    jq -r '
      # Collect failures with classification
      [.. | objects | select(.specs?) | .specs[] | select(.ok == false) |
        . as $spec |
        .tests[] | select(.status == "unexpected") |
        {
          title: $spec.title,
          browser: .projectName,
          file: (.results[0].error.location.file // "unknown"),
          line: (.results[0].error.location.line // 0),
          error: (.results[0].error.message // "unknown"),
          pattern: (
            if (.results[0].error.message // "" | test("waitForFunction")) then "waitForFunction timeout"
            elif (.results[0].error.message // "" | test("toBeVisible")) then "toBeVisible assertion"
            elif (.results[0].error.message // "" | test("locator\\.click|click.*timeout"; "i")) then "locator.click timeout"
            elif (.results[0].error.message // "" | test("toHaveLength")) then "toHaveLength assertion"
            elif (.results[0].error.message // "" | test("page\\.goto|navigation.*timeout"; "i")) then "page.goto timeout"
            else "other"
            end
          )
        }
      ] |
      # Group by (file, pattern)
      group_by(.file + "|" + .pattern) |
      sort_by(-length) |
      .[] |
      . as $group |
      ($group | map(.browser) | unique | join(", ")) as $browsers |
      ($group[0].file | split("/") | last | split(".") | first) as $short_file |
      (
        "────────────────────────────────────────────────────────────",
        "\u001b[0;33mIssue: \($short_file) — \($group[0].pattern) (\(length) failures)\u001b[0m",
        "Title:    fix(test): \($short_file) tests fail with \($group[0].pattern)",
        "Labels:   bug, testing",
        "Browsers: \($browsers)",
        "File:     \($group[0].file)",
        "",
        "Failing tests:",
        ($group | group_by(.title) | sort_by(-length) | .[] |
          "  - L\(.[0].line): \(.[0].title) [\(map(.browser) | unique | join(", "))]"
        ),
        "",
        "Create with:",
        "  gh issue create --title \"fix(test): \($short_file) tests fail with \($group[0].pattern)\" \\",
        "    --label bug --label testing \\",
        "    --body \"...\"",
        ""
      )
    ' "{{results_file}}"
