# CI-parity playwright wrapper (#897) — see scripts/test-e2e-ci.mjs.
#
# Usage (from the repo root):
#   just -f scripts/ci-parity.just test-e2e-ci [--skip-build] [playwright args...]

# Run playwright against a production build on :4173 with CI=true,
# mirroring the GitHub Actions a11y/E2E jobs.
[no-cd]
test-e2e-ci *args:
    bun scripts/test-e2e-ci.mjs {{ args }}
