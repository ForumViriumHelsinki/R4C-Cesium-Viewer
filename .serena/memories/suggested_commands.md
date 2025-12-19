# Suggested Commands

## Development (Makefile - Recommended)

```bash
make help          # Show all commands with current status
make dev           # Backend in K8s + local frontend (fast iteration)
make dev-full      # Everything in containers (closer to production)
make stop          # Stop all services
make status        # Show environment status
make logs          # Tail logs from all services
```

## Database

```bash
make db-status     # Show connection info and table count
make db-migrate    # Run pending migrations
make db-import     # Import production dump from tmp/
make db-shell      # Open psql shell
make db-reset      # Drop and recreate database (destructive!)
```

## Testing

```bash
# Quick tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:quick             # Alias for unit tests

# E2E tests
npm run test:e2e               # All E2E tests
npm run test:accessibility     # Accessibility tests

# Single file testing (fast iteration)
npm run test:layer-controls    # Single accessibility test
npx playwright test --ui       # Interactive UI mode

# Full suite
npm run test:all               # Unit + integration + E2E
npm run test:coverage          # With coverage report

# Performance
npm run test:performance:monitor   # Track performance metrics
npm run test:performance:check     # Check for regressions
```

## Linting & Formatting

```bash
npm run lint           # Check with Biome
npm run lint:fix       # Auto-fix issues
npm run format         # Format with Biome
npm run format:check   # Check formatting
npm run check          # Full Biome check with fixes
npm run lint:deps      # Check unused dependencies (knip)
```

## Build

```bash
npm run build           # Production build
npm run build:analyze   # Build with bundle analyzer
npm run preview         # Preview production build
```

## Documentation

```bash
npm run docs           # Generate TypeDoc documentation
npm run docs:serve     # Generate and serve docs locally
```

## System Utilities (Darwin/macOS)

```bash
# Git
git status
git log --oneline -20
git diff

# File operations
ls -la
find . -name "*.vue" -type f
fd -e vue                  # Fast file finder

# Text search
grep -r "pattern" src/
rg "pattern"               # Fast ripgrep search

# Process management
ps aux | grep node
lsof -i :5173             # Check port usage
```

## Kubernetes/Container

```bash
kubectl get pods -n regions4climate
kubectl logs -f <pod-name> -n regions4climate
skaffold run -p services-only --port-forward
skaffold dev --port-forward
```
