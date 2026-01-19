# Bun Lock Management

Ensures bun.lock stays in sync with package.json to prevent CI/CD failures.

## The Problem

**Symptom in GitHub Actions**:

```
error: PackageNotFound
 Resolution failed. package "some-package" not found
```

or

```
bun install --frozen-lockfile failed
```

**Root Cause**: package.json was updated but bun.lock wasn't regenerated, causing:

- Lock file out of sync with dependencies
- CI/CD uses `bun install --frozen-lockfile` which requires exact lock file match
- Local `bun install` might work (updates lock), but CI fails
- Wasted time debugging "works on my machine" issues

## When Lock File Must Be Updated

### Automatic Updates Required:

1. **Adding dependencies**: `bun add <package>`
2. **Removing dependencies**: `bun remove <package>`
3. **Updating versions**: `bun update <package>`
4. **Changing version ranges** in package.json manually

### Manual package.json Edits:

When editing package.json directly (without bun commands), you MUST run:

```bash
bun install
```

This regenerates bun.lock with resolved versions.

## Detection: Is Lock File Stale?

### Check if update needed:

```bash
# Compare package.json modification time vs lock file
if [ package.json -nt bun.lock ]; then
  echo "Warning: bun.lock is stale - needs update"
fi
```

### Verify lock file integrity:

```bash
# This will fail if lock file doesn't match package.json
bun install --frozen-lockfile
```

If `bun install --frozen-lockfile` fails locally, your lock file is out of sync.

## The Solution: Always Update Both

### Rule 1: Use Bun Commands (Preferred)

```bash
# GOOD: bun handles lock file automatically
bun add express
bun remove lodash
bun update vue

# Commit both files
git add package.json bun.lock
git commit -m "feat: add express dependency"
```

### Rule 2: Manual Edit Workflow

```bash
# 1. Edit package.json manually
vim package.json

# 2. Regenerate lock file
bun install

# 3. Verify with CI command
bun install --frozen-lockfile

# 4. Commit both files
git add package.json bun.lock
git commit -m "chore: update dependencies"
```

### Rule 3: After Pulling Changes

```bash
# Always install after pulling
git pull
bun install  # Updates lock file if needed
```

## Pre-Commit Validation

### Git Hook (Recommended)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check if package.json is staged
if git diff --cached --name-only | grep -q "package.json"; then
  # Check if bun.lock is also staged
  if ! git diff --cached --name-only | grep -q "bun.lock"; then
    echo "ERROR: package.json modified but bun.lock not staged"
    echo "Run: bun install && git add bun.lock"
    exit 1
  fi
fi
```

### Manual Check Before Commit

```bash
# See what's staged
git diff --cached --name-status

# If package.json is in list, ensure bun.lock is too
# If not:
bun install
git add bun.lock
```

## CI/CD Implications

### Why CI Uses `--frozen-lockfile` Not Regular Install

```bash
# CI/CD (recommended)
bun install --frozen-lockfile
# - Installs from lock file exactly
# - Fails if lock file out of sync
# - Faster than regular install
# - Prevents "works locally" issues

# Local development
bun install
# - Installs from package.json
# - Updates lock file if needed
# - More forgiving
```

### GitHub Actions Best Practice

```yaml
# .github/workflows/test.yml
- name: Install dependencies
  run: bun install --frozen-lockfile # Not just bun install!
```

**Why this matters**: `--frozen-lockfile` catches lock file issues early, before deployment.

## Common Scenarios

### Scenario 1: Added Script in package.json

```json
// package.json - added new script only
{
	"scripts": {
		"test:new": "vitest run tests/new" // New script
	}
}
```

**Lock file update needed?** NO - scripts don't affect dependencies

### Scenario 2: Changed Version Range

```json
// Before
"vue": "^3.0.0"

// After
"vue": "^3.5.0"
```

**Lock file update needed?** YES

```bash
bun install
git add package.json bun.lock
```

### Scenario 3: Added Dev Dependency

```bash
bun add --dev playwright
```

**Lock file update needed?** YES (but bun did it automatically)

### Scenario 4: Removed Unused Package

```bash
bun remove lodash
```

**Lock file update needed?** YES (but bun did it automatically)

## Fixing Out-of-Sync Lock File

### If CI is failing:

```bash
# 1. Locally, regenerate lock file
bun install

# 2. Verify it works with CI command
bun install --frozen-lockfile

# 3. Commit the updated lock file
git add bun.lock
git commit -m "chore: update bun.lock"
git push
```

### If lock file has conflicts after merge:

```bash
# Don't manually resolve lock file conflicts!
# Instead, regenerate from package.json

# 1. Accept their version of package.json (or merge manually)
git checkout --theirs package.json

# 2. Regenerate lock file
rm bun.lock
bun install

# 3. Verify
bun install --frozen-lockfile

# 4. Commit
git add package.json bun.lock
git commit -m "chore: resolve dependency conflicts"
```

## Automation with Claude Code

### When modifying package.json:

1. **Before committing**, verify both files staged:

```bash
git status | grep -E "package.json|bun.lock"
```

2. **If only package.json staged**:

```bash
bun install
git add bun.lock
```

3. **Always run frozen install before pushing** to catch issues early:

```bash
bun install --frozen-lockfile && git push
```

## Red Flags to Watch For

### Warning Signs:

- `bun install` takes unusually long (lock file might be corrupt)
- Different developers get different versions locally
- CI passes locally but fails in GitHub Actions
- Merge conflicts in bun.lock (don't manually resolve!)

### Good Indicators:

- `bun install --frozen-lockfile` succeeds locally (lock file is valid)
- Both files modified together in git history
- No version mismatches across environments

## Quick Reference

| Situation                  | Command           | Lock File Updated?  |
| -------------------------- | ----------------- | ------------------- |
| `bun add <pkg>`            | Auto-updates lock | YES                 |
| `bun remove <pkg>`         | Auto-updates lock | YES                 |
| `bun update <pkg>`         | Auto-updates lock | YES                 |
| Edit package.json manually | Run `bun install` | MANUAL REQUIRED     |
| Add/remove script          | No action needed  | NO                  |
| `git pull`                 | Run `bun install` | CHECK NEEDED        |
| Merge conflict             | Regenerate lock   | REGENERATE REQUIRED |

## Debugging Lock File Issues

### Check lock file integrity:

```bash
bun pm ls
# Lists all installed packages
# Shows if any are missing or mismatched
```

### Force clean regeneration:

```bash
rm -rf node_modules bun.lock
bun install
bun install --frozen-lockfile  # Verify it works
```

### Check for outdated packages:

```bash
bun outdated
```

## Bun vs npm Command Equivalents

| npm Command            | Bun Equivalent                  |
| ---------------------- | ------------------------------- |
| `npm install`          | `bun install`                   |
| `npm ci`               | `bun install --frozen-lockfile` |
| `npm install <pkg>`    | `bun add <pkg>`                 |
| `npm install -D <pkg>` | `bun add --dev <pkg>`           |
| `npm uninstall <pkg>`  | `bun remove <pkg>`              |
| `npm update`           | `bun update`                    |
| `npm ls`               | `bun pm ls`                     |
| `npm outdated`         | `bun outdated`                  |
| `npx <cmd>`            | `bunx <cmd>`                    |

## Resources

- **Bun Install Docs**: https://bun.sh/docs/cli/install
- **bun.lock Spec**: https://bun.sh/docs/install/lockfile
- **Bun Package Manager**: https://bun.sh/docs/cli/pm
