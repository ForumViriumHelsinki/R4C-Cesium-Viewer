# Development

## Skaffold/Kubernetes Development

**One-Command Start:**

```bash
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
