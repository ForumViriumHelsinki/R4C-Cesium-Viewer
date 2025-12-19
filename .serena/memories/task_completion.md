# Task Completion Checklist

## Before Committing

### 1. Run Linting

```bash
npm run lint
# Or with auto-fix:
npm run lint:fix
```

### 2. Run Formatting

```bash
npm run format:check
# Or fix issues:
npm run format
```

### 3. Run Tests

**Minimum (after every change):**

```bash
npm run test:unit
```

**After feature completion:**

```bash
npm run test:all
```

**If UI changes:**

```bash
npm run test:accessibility
```

### 4. Check for Unused Dependencies

```bash
npm run lint:deps
```

### 5. Build Check

```bash
npm run build
```

## Commit Guidelines

### Conventional Commits

```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add or update tests
chore: maintenance tasks
```

### Pre-commit Hooks

The project uses pre-commit hooks that run automatically:

- detect-secrets (secret scanning)
- Biome linting/formatting

## After Task Completion

1. **Verify all tests pass**
2. **Check no linting errors**
3. **Ensure build succeeds**
4. **Review changes with `git diff`**
5. **Create descriptive commit message**

## Database Changes

If migrations were added:

```bash
make db-migrate
# Verify migration applied:
make db-status
```

## Performance-Critical Changes

If changes affect rendering or data loading:

```bash
npm run test:performance:check
```
