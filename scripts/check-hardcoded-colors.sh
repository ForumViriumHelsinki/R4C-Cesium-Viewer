#!/usr/bin/env bash
# Check for hardcoded color values in Vue component <style> blocks.
# Run: ./scripts/check-hardcoded-colors.sh [--fix-hints]
# Exit code: 0 = clean, 1 = violations found
#
# Patterns detected:
#   - rgba(0, 0, 0, X)  in non-shadow CSS  → use rgba(var(--v-theme-on-surface), X)
#   - rgba(255, 255, 255, X)               → use rgba(var(--v-theme-surface), X)
#   - #1976d2 / #1976D2  (Material primary) → use rgb(var(--v-theme-primary))
#   - background: white / background-color: white → use rgb(var(--v-theme-surface))
#   - color: black / color: #000            → use rgb(var(--v-theme-on-surface))
#   - color: #XXXXXX (arbitrary hex)        → use theme variable
#   - background-color: #XXXXXX            → use theme variable
#
# Exceptions (not flagged):
#   - box-shadow / drop-shadow / text-shadow values
#   - Comments (// or /* */)
#
# Note: Some hex colors are semantic (status indicators like green/red/orange).
# Review flagged items — not all are violations.

set -euo pipefail

SHOW_HINTS=false
[[ "${1:-}" == "--fix-hints" ]] && SHOW_HINTS=true

SRC_DIR="${2:-src}"
violations=0

# Use grep -E (extended regex) for each pattern separately, then merge
# This avoids the bash quoting issues with combined patterns
find_violations() {
  local dir="$1"

  {
    grep -rn -E 'rgba\(0,[[:space:]]*0,[[:space:]]*0' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
    grep -rn -E 'rgba\(255,[[:space:]]*255,[[:space:]]*255' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
    grep -rn -E '#1976[dD]2' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
    grep -rn -E 'background(-color)?:[[:space:]]*(white|#fff(fff)?)[[:space:]]*;' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
    grep -rn -E 'color:[[:space:]]*(black|#000(000)?)[[:space:]]*;' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
    grep -rn -E '(^|[[:space:]])(color|background-color):[[:space:]]*#[0-9a-fA-F]{3,8}[[:space:]]*;' "$dir" --include="*.vue" --include="*.css" --include="*.scss" 2>/dev/null || true
  } | sort -u
}

while IFS= read -r line; do
  # Skip box-shadow, drop-shadow, text-shadow lines
  if echo "$line" | grep -qE 'box-shadow|drop-shadow|text-shadow'; then
    continue
  fi

  # Skip comment lines
  if echo "$line" | grep -qE '^\s*(//|/\*|\*)'; then
    continue
  fi

  # Skip lines already using theme variables
  if echo "$line" | grep -qF 'var(--v-theme'; then
    continue
  fi

  # Skip SVG attributes (stroke, fill in template)
  if echo "$line" | grep -qE 'stroke=|fill='; then
    continue
  fi

  # Skip multi-line box-shadow continuation lines (indented, no property name)
  if echo "$line" | grep -qE ':[0-9]+:[[:space:]]+0[[:space:]]'; then
    continue
  fi

  # Skip JavaScript string values (inline styles in script sections)
  if echo "$line" | grep -qE "border:[[:space:]]*'|color:[[:space:]]*'"; then
    continue
  fi

  echo "$line"
  ((violations++)) || true
done < <(find_violations "$SRC_DIR")

if [[ $violations -gt 0 ]]; then
  echo ""
  echo "Found $violations potential hardcoded color violation(s)."
  echo "See .claude/rules/code-quality.md 'CSS Theming' section for migration patterns."
  echo ""
  echo "Note: Some may be intentional (status colors, data visualization)."
  echo "Review each flagged item before migrating."

  if $SHOW_HINTS; then
    echo ""
    echo "Quick reference:"
    echo "  rgba(0,0,0,X)          → rgba(var(--v-theme-on-surface), X)"
    echo "  rgba(255,255,255,X)    → rgba(var(--v-theme-surface), X)"
    echo "  #1976d2                → rgb(var(--v-theme-primary))"
    echo "  background: white      → background: rgb(var(--v-theme-surface))"
    echo "  color: black/#000      → color: rgb(var(--v-theme-on-surface))"
    echo "  color: #4caf50 (green) → color: rgb(var(--v-theme-success))"
    echo "  color: #ff9800 (amber) → color: rgb(var(--v-theme-warning))"
    echo "  color: #f44336 (red)   → color: rgb(var(--v-theme-error))"
  fi

  exit 1
else
  echo "No hardcoded color violations found."
  exit 0
fi
