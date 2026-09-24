/**
 * Security Scan gate (#947). Run from the repo root: `bun scripts/security/audit-gate.mjs`
 * (`just audit` locally, the Security Scan job in CI).
 *
 * Fails when any of these hold, and reports all of them in one run:
 * 1. A package.json override floor is itself inside a vulnerable range, so the
 *    override does not guarantee a fixed version. Checked against the npm bulk
 *    advisory endpoint, the same source `bun audit` queries.
 * 2. An entry in .github/audit-allowlist.json is malformed or past its expiry.
 * 3. `bun audit` reports any advisory not on the active allowlist. `bun audit`
 *    stays the authority here; this script only passes it `--ignore` flags.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkAllowlist, floorOf, vulnerableFloors } from './auditPolicy.mjs'

const ALLOWLIST_PATH = '.github/audit-allowlist.json'
const BULK_ADVISORY_URL = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const floors = Object.fromEntries(
	Object.entries(pkg.overrides ?? {}).map(([name, range]) => [name, floorOf(range)])
)

const response = await fetch(BULK_ADVISORY_URL, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(Object.fromEntries(Object.entries(floors).map(([n, v]) => [n, [v]]))),
})
if (!response.ok) {
	throw new Error(`npm bulk advisory endpoint returned HTTP ${response.status}`)
}
const floorErrors = vulnerableFloors(floors, await response.json())
console.log(`Checked ${Object.keys(floors).length} override floors against npm advisories.`)

const today = new Date().toISOString().slice(0, 10)
const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
const { errors: allowlistErrors, activeIds } = checkAllowlist(allowlist, today)

for (const error of [...floorErrors, ...allowlistErrors]) console.log(`::error::${error}`)

const ignoreArgs = activeIds.map((id) => `--ignore=${id}`)
console.log(
	activeIds.length > 0
		? `Running bun audit, ignoring allowlisted ${activeIds.join(', ')} (${ALLOWLIST_PATH}).`
		: 'Running bun audit with no allowlisted advisories.'
)
const audit = spawnSync('bun', ['audit', ...ignoreArgs], { stdio: 'inherit' })
if (audit.error) console.log(`::error::could not run bun audit: ${audit.error.message}`)

const failed = floorErrors.length > 0 || allowlistErrors.length > 0 || audit.status !== 0
process.exit(failed ? 1 : 0)
