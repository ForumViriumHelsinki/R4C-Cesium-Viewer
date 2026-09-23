/**
 * Every feature flag needs a runtime reader (#983).
 *
 * The HDR and ambient-occlusion flags were declared here and targeted in GOFF
 * while nothing mapped them to graphics settings, so toggling them had no
 * effect. This sweep finds each flag name that no source file outside the
 * flag plumbing refers to as a string literal (`isEnabled('x')`, a registry
 * `flag: 'x'` entry, and so on).
 *
 * Flags that are knowingly dormant are listed in DORMANT with the reason. The
 * list must stay exact: a dormant flag that gains a reader, or is deleted,
 * fails the test until it is removed from the list.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_FLAG_NAMES } from '@/constants/flagMetadata'

// Vitest runs from the repository root.
const SRC_DIR = resolve(process.cwd(), 'src')

// Files that declare, store, evaluate or list flags generically. A mention
// here says nothing about whether the flag changes behaviour.
const FLAG_PLUMBING = new Set([
	'constants/flagMetadata.ts',
	'stores/featureFlagStore.ts',
	'services/featureFlagProvider.ts',
	'components/FeatureFlagsPanel.vue',
])

// Flags with no reader, on purpose or pending a decision. One line each.
const DORMANT = {
	showFeaturePanel: 'read by FeatureFlagsPanel.vue itself, to show or hide the panel',
	grid250m: 'no reader; the 250 m grid layer follows toggleStore.grid250m instead',
	terrain3d: 'planned, not built: docs/prd/feature-flag-implementations.md section 1',
	controlPanelDefault: 'no reader; toggleStore.sidebarMode defaults to expanded regardless',
	dataSourceStatus: 'no reader; App.vue mounts DataSourceStatusBadge unconditionally',
	loadingPerformanceInfo: 'planned, not built: docs/prd/feature-flag-implementations.md section 2',
	sentryErrorTracking: 'no reader; main.js initialises Sentry whenever VITE_SENTRY_DSN is set',
	digitransitIntegration:
		'no reader; UnifiedSearch.vue geocoding via /digitransit is not gated on it',
	backgroundMapProviders: 'planned, not built: docs/prd/feature-flag-implementations.md section 3',
	debugMode: 'no reader; logger.debug follows import.meta.env.DEV',
	cacheVisualization: 'planned, not built: docs/prd/feature-flag-implementations.md section 4',
	healthChecks: 'planned, not built: docs/prd/feature-flag-implementations.md section 5',
}

function listSourceFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) return listSourceFiles(path)
		return /\.(js|ts|vue)$/.test(entry.name) ? [path] : []
	})
}

const readerSources = listSourceFiles(SRC_DIR)
	.filter((path) => !FLAG_PLUMBING.has(relative(SRC_DIR, path)))
	.map((path) => ({ path: relative(SRC_DIR, path), text: readFileSync(path, 'utf8') }))

function readersOf(flagName) {
	return readerSources
		.filter(({ text }) => text.includes(`'${flagName}'`) || text.includes(`"${flagName}"`))
		.map(({ path }) => path)
}

describe('feature flag readers', { tags: ['@unit'] }, () => {
	it('finds readers for flags known to be read (scanner control)', () => {
		expect(readersOf('viewportStreaming')).toContain('services/capitalRegion.js')
		expect(readersOf('heatHistogram')).toContain('constants/analysisRegistry.js')
		expect(readersOf('deckglRenderer')).toContain('App.vue')
	})

	it('every flag outside DORMANT has a runtime reader', () => {
		const unread = ALL_FLAG_NAMES.filter(
			(name) => !(name in DORMANT) && readersOf(name).length === 0
		)
		expect(unread).toEqual([])
	})

	it('DORMANT lists only existing flags that still have no reader', () => {
		const stale = Object.keys(DORMANT).filter(
			(name) => !ALL_FLAG_NAMES.includes(name) || readersOf(name).length > 0
		)
		expect(stale).toEqual([])
	})
})
