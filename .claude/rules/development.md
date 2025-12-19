# Development

## Development Modes

| Mode            | Command                       | Backend                | Use Case            |
| --------------- | ----------------------------- | ---------------------- | ------------------- |
| Mock API        | `make dev-mock`               | Synthetic data (:5050) | Frontend UI work    |
| Full Stack      | `make dev` + `make db-seed`   | PostgreSQL (:5000)     | Feature development |
| Production Data | `make dev` + `make db-import` | 18GB dump              | Bug reproduction    |

**Choose Mock API when:**

- Developing UI components or styling
- No database queries need testing
- Want fastest possible iteration (no K8s/Docker)

**Choose Full Stack when:**

- Testing data fetching logic
- Verifying database queries
- Need realistic data relationships

**Choose Production Data when:**

- Reproducing a specific production bug
- Testing with real-world data distributions

## Skaffold/Kubernetes Development

**One-Command Start:**

```bash
make dev-mock  # Mock API (fastest - no database/K8s required)
make dev       # Local frontend + K8s services (fast iteration)
make dev-full  # All in containers (closer to production)
make stop      # Stop all services
```

**Profiles:**

- Default: Full stack with PostgreSQL + PostGIS
- `services-only`: Backend services only (use with `npm run dev`)
- `frontend-only`: Frontend only (assumes services running)
- `e2e-with-prod-data`: E2E testing with cloned production data

## Code Search Tools

### Serena (Semantic Code Analysis)

MCP-based LSP integration for symbol-aware code navigation:

```
find_symbol "ComponentName"           # Locate by name path pattern
find_symbol "store/action" depth=1    # Find with children
find_referencing_symbols "MyService"  # Find all references
get_symbols_overview "src/stores/"    # High-level file structure
search_for_pattern "TODO|FIXME"       # Regex search with filtering
```

**When to use Serena:**

- Understanding code structure and relationships
- Finding all usages of a function/component
- Navigating unfamiliar code
- Refactoring with confidence (find all references first)

### ast-grep (Structural Search)

Pattern-based code search using AST:

```bash
# Vue patterns
ast-grep -p 'defineProps<$TYPE>()'                    # Find typed props
ast-grep -p 'const $STORE = use$NAME()'               # Find Pinia store usage
ast-grep -p 'watch($DEPS, ($$$) => { $$$ })'          # Find watchers

# JavaScript patterns
ast-grep -p 'async function $NAME($$$) { $$$ }'       # Find async functions
ast-grep -p 'console.log($$$)'                        # Find console.log
ast-grep -p 'await $PROMISE.catch($$$)'               # Find error handling
```

**When to use ast-grep:**

- Finding specific code patterns across files
- Identifying anti-patterns for refactoring
- Searching for framework-specific constructs

## Building

```bash
npm run build    # Production build
npm run dev      # Development server with hot reload
npm run lint     # ESLint check
npm run lint:fix # ESLint auto-fix
```

## CI/CD

- `container-build.yml` - Builds and pushes to GHCR on push to main and tags
- `release-please.yml` - Manages releases and CHANGELOG via conventional commits
- `lighthouse-ci.yml` - Performance monitoring on PRs
