/**
 * Pure policy checks behind the Security Scan gate (scripts/security/audit-gate.mjs).
 *
 * Kept free of I/O so tests/unit/ci/auditPolicy.test.js can exercise them with
 * fixed dates and fixture advisories.
 */

/** GitHub advisory IDs use a restricted alphabet: GHSA-xxxx-xxxx-xxxx. */
export const GHSA_ID = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const FLOOR = /^(?:\^|~|>=\s*)?v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/

/**
 * Lowest version a range admits, for the range shapes used in package.json
 * overrides (`^x.y.z`, `~x.y.z`, `>=x.y.z`, `x.y.z`). Anything else throws, so
 * a new range shape fails the gate loudly instead of being skipped.
 * @param {string} range
 * @returns {string}
 */
export function floorOf(range) {
	const match = FLOOR.exec(String(range).trim())
	if (!match) {
		throw new Error(`Cannot derive a floor version from range "${range}"; extend floorOf().`)
	}
	return match[1]
}

/**
 * Validate the advisory allowlist. An entry needs a GHSA id, the package it
 * applies to, a reason, and an expiry date; an entry past its expiry is an
 * error, so every exception is re-reviewed rather than kept indefinitely.
 * @param {unknown} allowlist parsed .github/audit-allowlist.json
 * @param {string} today ISO date (YYYY-MM-DD)
 * @returns {{ errors: string[], activeIds: string[] }}
 */
export function checkAllowlist(allowlist, today) {
	const errors = []
	const activeIds = []
	const entries = /** @type {any} */ (allowlist)?.advisories
	if (!Array.isArray(entries)) {
		return { errors: ['audit allowlist must be an object with an "advisories" array'], activeIds }
	}
	const seen = new Set()
	for (const [index, entry] of entries.entries()) {
		const label = `audit allowlist entry ${index} (${entry?.id ?? 'no id'})`
		if (!GHSA_ID.test(entry?.id ?? '')) errors.push(`${label}: "id" must be a GHSA advisory ID`)
		if (seen.has(entry?.id)) errors.push(`${label}: duplicate id`)
		seen.add(entry?.id)
		if (!entry?.package) errors.push(`${label}: "package" is required`)
		if (!entry?.reason) errors.push(`${label}: "reason" is required`)
		if (!ISO_DATE.test(entry?.expires ?? '') || Number.isNaN(Date.parse(entry.expires))) {
			errors.push(`${label}: "expires" must be a YYYY-MM-DD date`)
			continue
		}
		if (entry.expires < today) {
			errors.push(`${label}: expired on ${entry.expires}; re-check the advisory and fix or renew it`)
			continue
		}
		activeIds.push(entry.id)
	}
	return { errors, activeIds }
}

/**
 * Override floors that are themselves vulnerable. `advisoriesByPackage` is the
 * npm bulk-advisory response for `{ [pkg]: [floor] }`, so any advisory listed
 * for a package applies to that package's floor.
 * @param {Record<string, string>} floors package -> floor version
 * @param {Record<string, { url?: string, vulnerable_versions?: string }[]>} advisoriesByPackage
 * @returns {string[]}
 */
export function vulnerableFloors(floors, advisoriesByPackage) {
	return Object.entries(floors)
		.filter(([pkg]) => (advisoriesByPackage[pkg] ?? []).length > 0)
		.map(([pkg, floor]) => {
			const ids = advisoriesByPackage[pkg]
				.map((a) => `${a.url?.split('/').pop() ?? '?'} (${a.vulnerable_versions ?? '?'})`)
				.join(', ')
			return `override floor ${pkg}@${floor} is inside a vulnerable range: ${ids}`
		})
		.sort()
}
