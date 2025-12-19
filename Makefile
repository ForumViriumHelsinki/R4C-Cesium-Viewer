# R4C-Cesium-Viewer Development Makefile
# ========================================
# Unified entry point for local development workflows.
# Database data persists across restarts via Kubernetes PVC.
#
# Quick Start:
#   make dev       - Backend in K8s + local frontend (fast iteration)
#   make dev-full  - Everything in containers (slower, but closer to prod)

.PHONY: help setup status logs \
        dev dev-full dev-mock stop stop-frontend \
        db-wait db-status db-migrate db-seed db-seed-clean db-import db-shell db-reset \
        mock-api mock-generate mock-stop \
        test test-quick test-e2e \
        lint build

.DEFAULT_GOAL := help

# ==============================================================================
# Configuration
# ==============================================================================

NAMESPACE := regions4climate
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_USER ?= regions4climate_user
DB_PASS ?= regions4climate_pass
DB_NAME ?= regions4climate
DB_ADMIN_USER ?= postgres
DB_ADMIN_PASS ?= postgres
DB_WAIT_TIMEOUT := 120
DB_WAIT_INTERVAL := 2

# Seeding configuration
SEED_RECORDS ?= 100
SEED_SCRIPT := db/scripts/seed-dev-data.py

# Paths
DUMP_DIR := tmp/regions4climate-dir
DUMP_FILE := tmp/regions4climate.dump
DUMP_SQL := tmp/regions4climate-dump.sql

# Colors and symbols
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
CYAN := \033[0;36m
DIM := \033[0;90m
RESET := \033[0m
CHECK := $(GREEN)✓$(RESET)
CROSS := $(RED)✗$(RESET)
ARROW := $(CYAN)→$(RESET)

# ==============================================================================
# Status Detection Functions
# ==============================================================================

define check_db_ready
$(shell pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null && echo "yes" || echo "no")
endef

define check_pods_running
$(shell kubectl get pods -n $(NAMESPACE) --no-headers 2>/dev/null | grep -c Running || echo "0")
endef

define check_npm_dev
$(shell pgrep -f "vite" >/dev/null 2>&1 && echo "yes" || echo "no")
endef

# ==============================================================================
# Getting Started
# ==============================================================================

help: ## Show available commands
	@echo ""
	@echo "$(CYAN)R4C-Cesium-Viewer Development$(RESET)"
	@echo ""
	@echo "$(DIM)Current Status:$(RESET)"
	@if pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null; then \
		tables=$$(PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME) -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "?"); \
		echo "  Database:  $(CHECK) Connected ($$tables tables)"; \
	else \
		echo "  Database:  $(CROSS) Not connected"; \
	fi
	@if pgrep -f "vite" >/dev/null 2>&1; then \
		echo "  Frontend:  $(CHECK) Vite running (localhost:5173)"; \
	elif kubectl get pods -n $(NAMESPACE) -l app=frontend --no-headers 2>/dev/null | grep -q Running; then \
		echo "  Frontend:  $(CHECK) Container running (localhost:4173)"; \
	else \
		echo "  Frontend:  $(CROSS) Not running"; \
	fi
	@echo ""
	@echo "$(DIM)Quick Start:$(RESET)"
	@echo "  make dev       $(DIM)- Backend in K8s + local frontend (fast)$(RESET)"
	@echo "  make dev-full  $(DIM)- Everything in containers$(RESET)"
	@echo "  make db-seed   $(DIM)- Seed database with test data (recommended)$(RESET)"
	@echo ""
	@echo "$(DIM)All Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-14s$(RESET) %s\n", $$1, $$2}'
	@echo ""

setup: ## First-time setup (install dependencies, check tools)
	@echo "$(ARROW) Checking required tools..."
	@command -v skaffold >/dev/null || { echo "$(CROSS) skaffold not found. Install: brew install skaffold"; exit 1; }
	@command -v kubectl >/dev/null || { echo "$(CROSS) kubectl not found. Install: brew install kubectl"; exit 1; }
	@command -v node >/dev/null || { echo "$(CROSS) node not found. Install: brew install node"; exit 1; }
	@echo "$(CHECK) All tools installed"
	@echo ""
	@echo "$(ARROW) Installing npm dependencies..."
	@npm install
	@echo ""
	@echo "$(CHECK) Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  make dev       $(DIM)- Start development environment$(RESET)"
	@echo "  make db-seed   $(DIM)- Seed database with test data$(RESET)"

status: ## Show current environment status
	@echo ""
	@echo "$(CYAN)=== Kubernetes Pods ===$(RESET)"
	@kubectl get pods -n $(NAMESPACE) 2>/dev/null || echo "$(DIM)No pods running$(RESET)"
	@echo ""
	@echo "$(CYAN)=== PVC Status (database persistence) ===$(RESET)"
	@kubectl get pvc -n $(NAMESPACE) 2>/dev/null || echo "$(DIM)No PVCs$(RESET)"
	@echo ""
	@echo "$(CYAN)=== Port Forwards ===$(RESET)"
	@ps aux | grep -E "kubectl.*port-forward" | grep -v grep | awk '{print "  " $$0}' || echo "$(DIM)None active$(RESET)"
	@echo ""

logs: ## Tail logs from all services
	kubectl logs -f -l app -n $(NAMESPACE) --prefix --all-containers 2>/dev/null || \
		echo "$(CROSS) No pods running. Start with: make dev"

# ==============================================================================
# Development Modes
# ==============================================================================

dev: ## Start services + local frontend (fast iteration)
	@echo "$(ARROW) Starting backend services..."
	@skaffold run -p services-only --port-forward &
	@echo ""
	@echo "$(ARROW) Waiting for pods to be scheduled..."
	@sleep 5
	@echo "$(ARROW) Waiting for database..."
	@$(MAKE) db-wait
	@echo ""
	@echo "$(CHECK) Backend ready!"
	@echo ""
	@echo "$(ARROW) Starting local frontend (Ctrl+C to stop)..."
	@echo "$(DIM)Frontend: http://localhost:5173$(RESET)"
	@echo "$(DIM)PyGeoAPI: http://localhost:5000$(RESET)"
	@echo ""
	@npm run dev

dev-full: ## Start everything in Skaffold containers (services persist)
	@echo "$(ARROW) Starting backend services (will persist on stop)..."
	@skaffold run -p services-only --port-forward &
	@echo ""
	@echo "$(ARROW) Waiting for services to be ready..."
	@$(MAKE) db-wait
	@echo ""
	@echo "$(CHECK) Backend ready!"
	@echo ""
	@echo "$(ARROW) Starting frontend container (Ctrl+C to stop frontend only)..."
	@echo "$(DIM)Frontend: http://localhost:4173$(RESET)"
	@echo "$(DIM)PyGeoAPI: http://localhost:5000$(RESET)"
	@echo ""
	skaffold dev -p frontend-only --port-forward

stop: ## Stop all services
	@echo "$(ARROW) Stopping services..."
	@skaffold delete -p frontend-only 2>/dev/null || true
	@skaffold delete -p services-only 2>/dev/null || true
	@skaffold delete 2>/dev/null || true
	@echo "$(CHECK) Services stopped"
	@echo "$(DIM)Note: Database data preserved in PVC. Use 'make db-reset' to wipe.$(RESET)"

stop-frontend: ## Stop frontend only (keep services running)
	@echo "$(ARROW) Stopping frontend..."
	@skaffold delete -p frontend-only 2>/dev/null || true
	@echo "$(CHECK) Frontend stopped (services still running)"

# ==============================================================================
# Database Operations
# ==============================================================================

db-wait: ## Wait for database to be ready
	@elapsed=0; \
	while [ $$elapsed -lt $(DB_WAIT_TIMEOUT) ]; do \
		if pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null; then \
			echo "$(CHECK) Database ready ($$elapsed seconds)"; \
			exit 0; \
		fi; \
		printf "\r  $(DIM)Waiting for database... %ds / $(DB_WAIT_TIMEOUT)s$(RESET)" $$elapsed; \
		sleep $(DB_WAIT_INTERVAL); \
		elapsed=$$((elapsed + $(DB_WAIT_INTERVAL))); \
	done; \
	echo ""; \
	echo "$(CROSS) Database connection timeout after $(DB_WAIT_TIMEOUT)s"; \
	echo "$(DIM)Debug: kubectl logs postgresql-0 -n $(NAMESPACE)$(RESET)"; \
	exit 1

db-status: ## Show database connection info and stats
	@echo "$(CYAN)=== Database Status ===$(RESET)"
	@if pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null; then \
		echo "$(CHECK) Connected to $(DB_HOST):$(DB_PORT)"; \
		echo ""; \
		echo "$(DIM)Tables:$(RESET)"; \
		PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME) \
			-c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null; \
		echo ""; \
		echo "$(DIM)Database size:$(RESET)"; \
		PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME) \
			-c "SELECT pg_size_pretty(pg_database_size('$(DB_NAME)')) as size;" 2>/dev/null; \
	else \
		echo "$(CROSS) Not connected"; \
		echo "$(DIM)Start services with: make dev$(RESET)"; \
	fi

db-migrate: ## Run database migrations manually
	@echo "$(ARROW) Running migrations..."
	@if [ -f ./scripts/init-local-db.sh ]; then \
		./scripts/init-local-db.sh; \
	else \
		DATABASE_URL="postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable" dbmate up; \
	fi
	@echo "$(CHECK) Migrations complete"

db-seed: ## Seed database with test data (recommended for local dev)
	@echo "$(CYAN)=== Database Seeding ===$(RESET)"
	@echo ""
	@echo "$(DIM)This is the recommended approach for local development.$(RESET)"
	@echo "$(DIM)Seeding takes ~30-60 seconds vs 15-30 minutes for production import.$(RESET)"
	@echo ""
	@if ! pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null; then \
		echo "$(CROSS) Database not connected"; \
		echo "$(DIM)Start services first with: make dev$(RESET)"; \
		exit 1; \
	fi
	@echo "$(ARROW) Seeding database with $(SEED_RECORDS) records per table..."
	@if [ ! -f "$(SEED_SCRIPT)" ]; then \
		echo "$(CROSS) Seed script not found: $(SEED_SCRIPT)"; \
		exit 1; \
	fi
	@DATABASE_URL="postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)" \
		python3 $(SEED_SCRIPT) --num-records $(SEED_RECORDS)
	@echo ""
	@echo "$(CHECK) Seeding complete!"
	@echo ""
	@echo "$(DIM)Verify with: make db-status$(RESET)"
	@echo "$(DIM)Test API:    curl http://localhost:5000/collections$(RESET)"

db-seed-clean: ## Clear existing data and seed fresh
	@echo "$(CYAN)=== Database Seeding (Clean) ===$(RESET)"
	@echo ""
	@echo "$(YELLOW)This will clear existing data before seeding.$(RESET)"
	@echo ""
	@if ! pg_isready -h $(DB_HOST) -p $(DB_PORT) -q 2>/dev/null; then \
		echo "$(CROSS) Database not connected"; \
		echo "$(DIM)Start services first with: make dev$(RESET)"; \
		exit 1; \
	fi
	@echo "$(ARROW) Clearing and seeding database with $(SEED_RECORDS) records per table..."
	@DATABASE_URL="postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)" \
		python3 $(SEED_SCRIPT) --clear-first --num-records $(SEED_RECORDS)
	@echo ""
	@echo "$(CHECK) Seeding complete!"

db-import: ## Import production database from tmp/ (auto-detects format)
	@echo "$(CYAN)=== Database Import ===$(RESET)"
	@echo ""
	@echo "$(YELLOW)Note: For local development, consider using 'make db-seed' instead.$(RESET)"
	@echo "$(YELLOW)Seeding takes ~30-60 seconds vs 15-30 minutes for production import.$(RESET)"
	@echo ""
	@# Detect dump format (prefer directory > custom > SQL)
	@dump_path=""; dump_type=""; \
	if [ -d "$(DUMP_DIR)" ]; then \
		dump_path="$(DUMP_DIR)"; dump_type="directory"; \
		size=$$(du -sh "$(DUMP_DIR)" | cut -f1); \
		echo "$(CHECK) Found directory format dump: $(DUMP_DIR)"; \
		echo "$(DIM)  Size: $$size (best performance with parallel restore)$(RESET)"; \
	elif [ -f "$(DUMP_FILE)" ]; then \
		dump_path="$(DUMP_FILE)"; dump_type="custom"; \
		size=$$(du -h "$(DUMP_FILE)" | cut -f1); \
		echo "$(CHECK) Found custom format dump: $(DUMP_FILE)"; \
		echo "$(DIM)  Size: $$size (supports parallel restore)$(RESET)"; \
	elif [ -f "$(DUMP_SQL)" ]; then \
		dump_path="$(DUMP_SQL)"; dump_type="sql"; \
		size=$$(du -h "$(DUMP_SQL)" | cut -f1); \
		echo "$(CHECK) Found SQL dump: $(DUMP_SQL)"; \
		echo "$(DIM)  Size: $$size (slower, no parallel support)$(RESET)"; \
	else \
		echo "$(CROSS) No dump file found in tmp/"; \
		echo ""; \
		echo "$(DIM)Expected one of:$(RESET)"; \
		echo "$(DIM)  - $(DUMP_DIR)/ (directory format, recommended)$(RESET)"; \
		echo "$(DIM)  - $(DUMP_FILE) (custom format)$(RESET)"; \
		echo "$(DIM)  - $(DUMP_SQL) (plain SQL)$(RESET)"; \
		echo ""; \
		echo "$(DIM)To export from Cloud SQL:$(RESET)"; \
		echo "$(DIM)  make help-db-export$(RESET)"; \
		echo ""; \
		echo "$(GREEN)Or use seeding instead (recommended):$(RESET)"; \
		echo "$(GREEN)  make db-seed$(RESET)"; \
		exit 1; \
	fi; \
	echo ""; \
	echo "$(YELLOW)WARNING: This will import data into the current database!$(RESET)"; \
	echo "$(DIM)Database: $(DB_HOST):$(DB_PORT)/$(DB_NAME)$(RESET)"; \
	echo "$(DIM)Some 'already exists' errors are expected (non-fatal)$(RESET)"; \
	echo "$(DIM)Estimated time: 15-30 minutes for 18GB$(RESET)"; \
	echo ""; \
	read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1; \
	echo ""; \
	echo "$(ARROW) Starting import..."; \
	start_time=$$(date +%s); \
	if [ "$$dump_type" = "directory" ] || [ "$$dump_type" = "custom" ]; then \
		echo "$(DIM)Using parallel restore (4 jobs)$(RESET)"; \
		PGPASSWORD=$(DB_ADMIN_PASS) pg_restore \
			-h $(DB_HOST) -p $(DB_PORT) \
			-U $(DB_ADMIN_USER) \
			-d $(DB_NAME) \
			--no-owner \
			--no-acl \
			--jobs=4 \
			--verbose \
			"$$dump_path" 2>&1 | \
			while IFS= read -r line; do \
				case "$$line" in \
					*"processing data for table"*|*"finished item"*|*"launching item"*) \
						table=$$(echo "$$line" | sed -E 's/.*"([^"]+)".*/\1/' | sed 's/public.//'); \
						elapsed=$$(($$(date +%s) - $$start_time)); \
						printf "\r$(DIM)[%dm %ds] Processing: $$table$(RESET)                    " $$((elapsed/60)) $$((elapsed%60)); \
						;; \
				esac; \
			done; \
	elif [ "$$dump_type" = "sql" ]; then \
		echo "$(DIM)Using psql (no parallelization available for SQL dumps)$(RESET)"; \
		if command -v pv >/dev/null 2>&1; then \
			pv -pterb "$$dump_path" | PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME) -q; \
		else \
			echo "$(DIM)Tip: Install 'pv' for progress (brew install pv)$(RESET)"; \
			PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME) -q < "$$dump_path"; \
		fi; \
	fi; \
	elapsed=$$(($$(date +%s) - $$start_time)); \
	echo ""; \
	echo "$(CHECK) Import complete in $$((elapsed/60))m $$((elapsed%60))s"; \
	echo ""; \
	echo "$(DIM)Verify tables:$(RESET) make db-status"

help-db-export: ## Show how to export database from Cloud SQL
	@echo "$(CYAN)=== Export from Cloud SQL ===$(RESET)"
	@echo ""
	@echo "$(DIM)# Option 1: Directory Format (Recommended - fastest, parallel)$(RESET)"
	@echo "cloud-sql-proxy --auto-iam-authn fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &"
	@echo "pg_dump -h 127.0.0.1 -p 5433 -U \$$(gcloud config get-value account) -d regions4climate \\"
	@echo "  --format=directory --no-owner --no-acl --jobs=4 -f tmp/regions4climate-dir"
	@echo "pkill cloud-sql-proxy"
	@echo ""
	@echo "$(DIM)# Option 2: Custom Format (Good - parallel restore)$(RESET)"
	@echo "cloud-sql-proxy --auto-iam-authn fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &"
	@echo "pg_dump -h 127.0.0.1 -p 5433 -U \$$(gcloud config get-value account) -d regions4climate \\"
	@echo "  --format=custom --no-owner --no-acl --compress=6 -f tmp/regions4climate.dump"
	@echo "pkill cloud-sql-proxy"
	@echo ""
	@echo "$(DIM)See docs/DATABASE_IMPORT.md for full details$(RESET)"

db-shell: ## Open psql shell
	@echo "$(ARROW) Connecting to database..."
	@PGPASSWORD=$(DB_ADMIN_PASS) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_ADMIN_USER) -d $(DB_NAME)

db-reset: ## WARNING: Delete database and start fresh
	@echo ""
	@echo "$(RED)WARNING: This will DELETE ALL DATABASE DATA!$(RESET)"
	@echo ""
	@echo "The PVC 'data-postgresql-0' will be removed."
	@echo "You will need to re-import the database."
	@echo ""
	@read -p "Type 'DELETE' to confirm: " confirm && [ "$$confirm" = "DELETE" ] || { echo "Aborted."; exit 1; }
	@echo ""
	@echo "$(ARROW) Stopping services..."
	@skaffold delete -p services-only 2>/dev/null || true
	@skaffold delete 2>/dev/null || true
	@echo "$(ARROW) Deleting PVC..."
	@kubectl delete pvc data-postgresql-0 -n $(NAMESPACE) --ignore-not-found
	@echo ""
	@echo "$(CHECK) Database reset complete"
	@echo "$(DIM)Run 'make dev' to recreate, then 'make db-seed' to populate with test data$(RESET)"

# ==============================================================================
# Testing
# ==============================================================================

test: ## Run all tests
	npm run test:all

test-quick: ## Run unit tests only (fast)
	npm run test:unit

test-e2e: ## Run end-to-end tests
	npm run test:e2e

# ==============================================================================
# Mock API (No Database Required)
# ==============================================================================

MOCK_API_DIR := mock-api
MOCK_DENSITY ?= 50

mock-api: mock-generate ## Start mock PyGeoAPI server (no database needed)
	@echo "$(ARROW) Starting mock PyGeoAPI server..."
	@echo "$(DIM)Serves synthetic data from mock-api/fixtures/$(RESET)"
	@echo ""
	@cd $(MOCK_API_DIR) && bun run dev

mock-generate: ## Generate mock GeoJSON fixtures
	@echo "$(CYAN)=== Mock Data Generator ===$(RESET)"
	@echo ""
	@if [ ! -d "$(MOCK_API_DIR)/fixtures" ] || [ -z "$$(ls -A $(MOCK_API_DIR)/fixtures 2>/dev/null)" ]; then \
		echo "$(ARROW) Generating fixtures ($(MOCK_DENSITY) buildings per postal code)..."; \
		cd $(MOCK_API_DIR) && bun install --silent && bun run generate --density $(MOCK_DENSITY); \
	else \
		echo "$(CHECK) Fixtures already exist in $(MOCK_API_DIR)/fixtures/"; \
		echo "$(DIM)To regenerate: rm -rf $(MOCK_API_DIR)/fixtures && make mock-generate$(RESET)"; \
	fi

mock-stop: ## Stop mock API server
	@echo "$(ARROW) Stopping mock API..."
	@pkill -f "bun.*server.ts" 2>/dev/null || true
	@echo "$(CHECK) Mock API stopped"

dev-mock: ## Start frontend with mock API (no database/K8s needed)
	@echo "$(CYAN)=== Development with Mock API ===$(RESET)"
	@echo ""
	@echo "$(DIM)This mode uses synthetic data - no database or Kubernetes required.$(RESET)"
	@echo "$(DIM)Perfect for frontend development and testing.$(RESET)"
	@echo ""
	@# Ensure fixtures exist
	@$(MAKE) mock-generate
	@echo ""
	@echo "$(ARROW) Starting mock API in background..."
	@cd $(MOCK_API_DIR) && bun run start &
	@sleep 2
	@echo "$(CHECK) Mock API running on http://localhost:5050"
	@echo ""
	@echo "$(ARROW) Starting frontend..."
	@echo "$(DIM)Frontend: http://localhost:5173$(RESET)"
	@echo "$(DIM)Mock API: http://localhost:5050$(RESET)"
	@echo ""
	@npm run dev || ($(MAKE) mock-stop && exit 1)
	@# Stop mock API when frontend exits
	@$(MAKE) mock-stop

# ==============================================================================
# Maintenance
# ==============================================================================

lint: ## Run ESLint
	npm run lint

build: ## Production build
	npm run build
