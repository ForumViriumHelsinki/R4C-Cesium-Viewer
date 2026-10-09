/**
 * Every flag's fallbackDefault must equal its GOFF defaultRule.
 *
 * The InMemoryProvider serves fallbackDefault whenever the GOFF relay is
 * unreachable: during a production relay outage, and always in CI, where
 * Lighthouse runs against `vite preview` with no relay. backgroundPreload and
 * predictivePrefetch fell back to true while GOFF serves anonymous users false,
 * so every Lighthouse run downloaded ~99 MB of NDVI GeoTIFFs and prefetched
 * off-screen building tiles that production visitors never load.
 *
 * Targeting rules (e.g. `domain eq "forumvirium.fi"`) need a relay to
 * evaluate, so the fallback matches the defaultRule, which is what an
 * anonymous visitor gets.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ALL_FLAG_NAMES, FLAG_METADATA } from '@/constants/flagMetadata'

// Vitest runs from the repository root.
const goffFlags = parse(readFileSync(resolve(process.cwd(), 'flags.goff.yaml'), 'utf8'))

const goffDefault = (goffId) => {
	const flag = goffFlags[goffId]
	return flag.variations[flag.defaultRule.variation]
}

describe('flag fallbacks match GOFF defaults', { tags: ['@unit'] }, () => {
	it('declares every flag in flags.goff.yaml with a defaultRule variation', () => {
		const missing = ALL_FLAG_NAMES.map((name) => FLAG_METADATA[name].goffId).filter(
			(goffId) => goffFlags[goffId]?.defaultRule?.variation === undefined
		)
		expect(missing).toEqual([])
	})

	// A flag with a configRequirement (Sentry DSN, Digitransit key) falls back
	// to "on" only when its configuration is present in the build.
	it.each(ALL_FLAG_NAMES)('%s falls back to its GOFF defaultRule value', (name) => {
		const { goffId, fallbackDefault, configRequirement } = FLAG_METADATA[name]
		const configured = configRequirement?.present ?? true
		expect(fallbackDefault).toBe(goffDefault(goffId) && configured)
	})
})
