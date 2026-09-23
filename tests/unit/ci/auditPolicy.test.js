/**
 * Policy behind the Security Scan gate (scripts/security/audit-gate.mjs, #947):
 * override floors must sit outside every vulnerable range, and advisory
 * allowlist entries must carry a GHSA id, a reason and an expiry date.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
	checkAllowlist,
	floorOf,
	vulnerableFloors,
} from '../../../scripts/security/auditPolicy.mjs'

const entry = (overrides = {}) => ({
	id: 'GHSA-5p2g-fcmc-qvqq',
	package: 'image-size',
	reason: 'fixed only in a major version the consumer does not accept',
	expires: '2026-12-31',
	...overrides,
})

describe('floorOf', () => {
	it.each([
		['^7.29.0', '7.29.0'],
		['~8.5.23', '8.5.23'],
		['>=5.0.9', '5.0.9'],
		['3.4.13', '3.4.13'],
		['^5.0.0-beta.1', '5.0.0-beta.1'],
	])('%s -> %s', (range, floor) => {
		expect(floorOf(range)).toBe(floor)
	})

	it.each(['*', '1.x', '>=1 <2', 'latest', '^9'])('throws on unsupported range %s', (range) => {
		expect(() => floorOf(range)).toThrow(/Cannot derive a floor/)
	})

	it('derives a floor for every override in package.json', () => {
		const { overrides } = JSON.parse(readFileSync('package.json', 'utf8'))
		for (const range of Object.values(overrides)) expect(() => floorOf(range)).not.toThrow()
	})
})

describe('vulnerableFloors', () => {
	it('reports each floor with advisories and ignores clean ones', () => {
		const floors = { undici: '7.28.0', dompurify: '3.4.13' }
		const advisories = {
			undici: [
				{
					url: 'https://github.com/advisories/GHSA-4cwx-7wf7-3272',
					vulnerable_versions: '>=7.0.0 <7.29.0',
				},
			],
		}
		expect(vulnerableFloors(floors, advisories)).toEqual([
			'override floor undici@7.28.0 is inside a vulnerable range: GHSA-4cwx-7wf7-3272 (>=7.0.0 <7.29.0)',
		])
	})

	it('returns nothing when no floor has advisories', () => {
		expect(vulnerableFloors({ undici: '7.29.0' }, {})).toEqual([])
		expect(vulnerableFloors({ undici: '7.29.0' }, { undici: [] })).toEqual([])
	})
})

describe('checkAllowlist', () => {
	it('activates an unexpired, well-formed entry', () => {
		expect(checkAllowlist({ advisories: [entry()] }, '2026-09-23')).toEqual({
			errors: [],
			activeIds: ['GHSA-5p2g-fcmc-qvqq'],
		})
	})

	it('keeps an entry active on its expiry date and rejects it the day after', () => {
		expect(checkAllowlist({ advisories: [entry()] }, '2026-12-31').activeIds).toEqual([
			'GHSA-5p2g-fcmc-qvqq',
		])
		const expired = checkAllowlist({ advisories: [entry()] }, '2027-01-01')
		expect(expired.activeIds).toEqual([])
		expect(expired.errors).toEqual([expect.stringMatching(/expired on 2026-12-31/)])
	})

	it.each([
		['a non-GHSA id', { id: 'CVE-2024-0001' }, /GHSA advisory ID/],
		['a missing package', { package: '' }, /"package" is required/],
		['a missing reason', { reason: undefined }, /"reason" is required/],
		['a missing expiry', { expires: undefined }, /"expires" must be/],
		['a malformed expiry', { expires: '31.12.2026' }, /"expires" must be/],
	])('rejects %s', (_label, change, message) => {
		const result = checkAllowlist({ advisories: [entry(change)] }, '2026-09-23')
		expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(message)]))
	})

	it('rejects duplicates and a missing advisories array', () => {
		expect(checkAllowlist({ advisories: [entry(), entry()] }, '2026-09-23').errors).toEqual([
			expect.stringMatching(/duplicate id/),
		])
		expect(checkAllowlist({}, '2026-09-23').errors).toEqual([
			expect.stringMatching(/"advisories" array/),
		])
	})

	it('the committed allowlist is well formed (expiry is enforced by the gate, not here)', () => {
		const allowlist = JSON.parse(readFileSync('.github/audit-allowlist.json', 'utf8'))
		// Evaluate on a date before any plausible expiry so only format errors count.
		expect(checkAllowlist(allowlist, '2000-01-01').errors).toEqual([])
	})
})
