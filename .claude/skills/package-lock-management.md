# Package Lock Management

Ensures package-lock.json stays in sync with package.json to prevent CI/CD failures.

## The Problem

**Symptom in GitHub Actions**:

```
npm ERR! Cannot find module 'some-package'
npm ERR! code ENOENT
```

or

```
npm ci failed with exit code 1
```

**Root Cause**: package.json was updated but package-lock.json wasn't regenerated, causing:

- Lock file out of sync with dependencies
- CI/CD uses `npm ci` which requires exact lock file match
- Local `npm install` might work (updates lock), but CI fails
- Wasted time debugging "works on my machine" issues

## When Lock File Must Be Updated

### Automatic Updates Required:

1. **Adding dependencies**: `npm install <package>`
2. **Removing dependencies**: `npm uninstall <package>`
3. **Updating versions**: `npm update <package>`
4. **Changing version ranges** in package.json manually

### Manual package.json Edits:

When editing package.json directly (without npm commands), you MUST run:

```bash
npm install
```

This regenerates package-lock.json with resolved versions.

## Detection: Is Lock File Stale?

### Check if update needed:

```bash
# Compare package.json modification time vs lock file
if [ package.json -nt package-lock.json ]; then
  echo "⚠️  package-lock.json is stale - needs update"
fi
```

### Verify lock file integrity:

```bash
# This will fail if lock file doesn't match package.json
npm ci
```

If `npm ci` fails locally, your lock file is out of sync.

## The Solution: Always Update Both

### Rule 1: Use npm Commands (Preferred)

```bash
# ✅ GOOD: npm handles lock file automatically
npm install express
npm uninstall lodash
npm update vue

# Commit both files
git add package.json package-lock.json
git commit -m "feat: add express dependency"
```

### Rule 2: Manual Edit Workflow

```bash
# 1. Edit package.json manually
vim package.json

# 2. Regenerate lock file
npm install

# 3. Verify with CI command
npm ci

# 4. Commit both files
git add package.json package-lock.json
git commit -m "chore: update dependencies"
```

### Rule 3: After Pulling Changes

```bash
# Always install after pulling
git pull
npm install  # Updates lock file if needed
```

## Pre-Commit Validation

### Git Hook (Recommended)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check if package.json is staged
if git diff --cached --name-only | grep -q "package.json"; then
  # Check if package-lock.json is also staged
  if ! git diff --cached --name-only | grep -q "package-lock.json"; then
    echo "❌ ERROR: package.json modified but package-lock.json not staged"
    echo "Run: npm install && git add package-lock.json"
    exit 1
  fi
fi
```

### Manual Check Before Commit

```bash
# See what's staged
git diff --cached --name-status

# If package.json is in list, ensure package-lock.json is too
# If not:
npm install
git add package-lock.json
```

## CI/CD Implications

### Why CI Uses `npm ci` Not `npm install`

```bash
# CI/CD (recommended)
npm ci
# - Installs from lock file exactly
# - Fails if lock file out of sync
# - Faster than npm install
# - Prevents "works locally" issues

# Local development
npm install
# - Installs from package.json
# - Updates lock file if needed
# - More forgiving
```

### GitHub Actions Best Practice

```yaml
# .github/workflows/test.yml
- name: Install dependencies
  run: npm ci # Not npm install!
```

**Why this matters**: `npm ci` catches lock file issues early, before deployment.

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

**Lock file update needed?** ❌ NO - scripts don't affect dependencies

### Scenario 2: Changed Version Range

```json
// Before
"vue": "^3.0.0"

// After
"vue": "^3.5.0"
```

**Lock file update needed?** ✅ YES

```bash
npm install
git add package.json package-lock.json
```

### Scenario 3: Added Dev Dependency

```bash
npm install --save-dev playwright
```

**Lock file update needed?** ✅ YES (but npm did it automatically)

### Scenario 4: Removed Unused Package

```bash
npm uninstall lodash
```

**Lock file update needed?** ✅ YES (but npm did it automatically)

## Fixing Out-of-Sync Lock File

### If CI is failing:

```bash
# 1. Locally, regenerate lock file
npm install

# 2. Verify it works with CI command
npm ci

# 3. Commit the updated lock file
git add package-lock.json
git commit -m "chore: update package-lock.json"
git push
```

### If lock file has conflicts after merge:

```bash
# Don't manually resolve lock file conflicts!
# Instead, regenerate from package.json

# 1. Accept their version of package.json (or merge manually)
git checkout --theirs package.json

# 2. Regenerate lock file
rm package-lock.json
npm install

# 3. Verify
npm ci

# 4. Commit
git add package.json package-lock.json
git commit -m "chore: resolve dependency conflicts"
```

## Automation with Claude Code

### When modifying package.json:

1. **Before committing**, verify both files staged:

```bash
git status | grep package
```

2. **If only package.json staged**:

```bash
npm install
git add package-lock.json
```

3. **Always run `npm ci` before pushing** to catch issues early:

```bash
npm ci && git push
```

## Red Flags to Watch For

### ⚠️ Warning Signs:

- `npm install` takes unusually long (lock file might be corrupt)
- Different developers get different versions locally
- CI passes locally but fails in GitHub Actions
- Merge conflicts in package-lock.json (don't manually resolve!)

### ✅ Good Indicators:

- `npm ci` succeeds locally (lock file is valid)
- Both files modified together in git history
- No version mismatches across environments

## Quick Reference

| Situation                  | Command           | Lock File Updated?     |
| -------------------------- | ----------------- | ---------------------- |
| `npm install <pkg>`        | Auto-updates lock | ✅ YES                 |
| `npm uninstall <pkg>`      | Auto-updates lock | ✅ YES                 |
| `npm update <pkg>`         | Auto-updates lock | ✅ YES                 |
| Edit package.json manually | Run `npm install` | ⚠️ MANUAL REQUIRED     |
| Add/remove script          | No action needed  | ❌ NO                  |
| `git pull`                 | Run `npm install` | ⚠️ CHECK NEEDED        |
| Merge conflict             | Regenerate lock   | ⚠️ REGENERATE REQUIRED |

## Debugging Lock File Issues

### Check lock file integrity:

```bash
npm ls
# Lists all installed packages
# Shows if any are missing or mismatched
```

### Force clean regeneration:

```bash
rm -rf node_modules package-lock.json
npm install
npm ci  # Verify it works
```

### Audit for vulnerabilities:

```bash
npm audit
npm audit fix  # Auto-fix if possible
# Commits both package.json and package-lock.json
```

## Resources

- **npm ci docs**: https://docs.npmjs.com/cli/v10/commands/npm-ci
- **package-lock.json spec**: https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json
- **Lock file best practices**: https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json#package-lockjson-vs-npm-shrinkwrapjson
