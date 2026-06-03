/**
 * Lighthouse CI Configuration
 *
 * This configuration defines performance budgets and testing parameters for
 * the R4C Cesium Viewer application. Given that CesiumJS is a heavy 3D mapping
 * library, the performance budgets are calibrated accordingly.
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */

module.exports = {
	ci: {
		collect: {
			// Build the production bundle and start preview server.
			// Call vite directly rather than via `bun run preview`: the bun
			// script wrapper prints its own "$ vite preview --host" banner first
			// and buffers vite's "➜  Local:" line, which can shadow the ready
			// pattern and trip startServerReadyTimeout before navigation starts.
			startServerCommand: 'bunx vite preview --host --port 4173',

			// Pattern to detect when server is ready.
			// Vite outputs: "➜  Local:   http://localhost:4173/" — match the
			// host:port directly so the wrapper banner can't shadow the match.
			// Default pattern is /listen|ready/i which doesn't match Vite's output.
			startServerReadyPattern: 'localhost:4173',

			// Timeout for server startup (ms) - allow extra time for CI.
			// Raised from 30s: a premature timeout lets lhci navigate against an
			// unconfirmed server, which is the first link in the PROTOCOL_TIMEOUT
			// failure chain on this heavy CesiumJS app.
			startServerReadyTimeout: 60000,

			// Test URL - preview server runs on port 4173 by default
			url: ['http://localhost:4173/'],

			// Number of runs for each URL
			// 3 runs so Lighthouse reports the median, smoothing out the
			// per-run variance inherent to CesiumJS's heavy initial load.
			// PROTOCOL_TIMEOUT is now avoided by blocking only the heavy
			// timeout-prone binaries (see blockedUrlPatterns below) rather
			// than by collapsing to a single run.
			numberOfRuns: 3,

			// Max wait time for page load (ms) - CesiumJS is heavy
			maxWaitForLoad: 90000,

			// Output directory for results (required for CI workflow parsing)
			outputDir: '.lighthouseci',

			// Additional settings for more accurate measurements
			settings: {
				// Lighthouse preset
				preset: 'desktop',

				// Increase max wait time for page to load (CesiumJS is heavy)
				maxWaitForFcp: 60000,
				maxWaitForLoad: 90000,

				// Disable throttling for CI environment
				// (GitHub Actions runners are already slower than local dev)
				throttling: {
					rttMs: 40,
					throughputKbps: 10240,
					cpuSlowdownMultiplier: 1,
				},

				// Chrome flags for better CI performance
				// --disable-dev-shm-usage is critical for preventing PROTOCOL_TIMEOUT
				chromeFlags: [
					'--disable-gpu',
					'--no-sandbox',
					'--disable-dev-shm-usage',
					'--disable-background-timer-throttling',
					'--disable-backgrounding-occluded-windows',
					'--disable-renderer-backgrounding',
					// Additional flags to reduce memory pressure and improve stability
					'--disable-extensions',
					'--disable-component-extensions-with-background-pages',
					'--disable-default-apps',
					'--mute-audio',
					'--no-first-run',
					'--disable-background-networking',
					'--disable-sync',
					'--disable-translate',
					'--metrics-recording-only',
				],

				// Block ONLY the heavy timeout-prone binaries that cause
				// PROTOCOL_TIMEOUT. The DevTools Protocol times out (30s
				// hardcoded) when trying to get response bodies for large
				// terrain tiles and 3D mesh/point-cloud data. Raster WMS tiles
				// (**/tile/**, **/tiles/**) are small PNGs and do NOT trip the
				// timeout — leaving them unblocked keeps the measured load
				// honest (they are part of the real page weight users pay for).
				blockedUrlPatterns: [
					// Helsinki 3D terrain data (large quantized-mesh tiles)
					'**/3d/datasource-data/**',
					'**/terrain-proxy/**',
					'*.terrain',
					'*.quantized-mesh',
					// 3D Tiles formats (can be very large)
					'*.b3dm',
					'*.pnts',
					'*.i3dm',
					'*.cmpt',
					'*.glb',
					'*.gltf',
					// Ion/Cesium cloud assets
					'*assets.cesium.com*',
					'*ion.cesium.com*',
				],

				// Skip only audits that are genuinely meaningless against a
				// localhost preview server (no HTTPS, no PWA), or that cannot
				// be measured honestly there. The unminified-* and
				// unused-javascript byte-weight audits now run again — with
				// only the heavy binaries blocked and the Lighthouse build
				// shipping no source maps (LIGHTHOUSE=true), they no longer
				// risk PROTOCOL_TIMEOUT and their findings are real signal.
				skipAudits: [
					'is-on-https', // CI runs on localhost
					'service-worker',
					'installable-manifest',
					'splash-screen',
					'themed-omnibox',
					'maskable-icon',
					'apple-touch-icon',
					// localhost preview serves no gzip, so this audit always
					// reports a false negative — measure it in the real
					// nginx/Envoy deploy instead.
					'uses-text-compression',
					// The Lighthouse build omits source maps (LIGHTHOUSE=true in
					// vite.config.js) so the multi-MB Cesium maps don't trip the
					// 30s DevTools body-read timeout. With no maps present this
					// audit only ever reports "missing source maps", so skip it.
					'valid-source-maps',
				],
			},
		},

		assert: {
			preset: 'lighthouse:recommended',

			assertions: {
				// Performance: honest measurement (real tile load, no throttling
				// override). Observed median ~0.35 across 3 runs on this heavy
				// CesiumJS app; gate ~0.05 below that so genuine regressions warn
				// without false-tripping every run. (Non-blocking warn.)
				'categories:performance': ['warn', { minScore: 0.3 }],

				// Accessibility: Should maintain high standards
				'categories:accessibility': ['error', { minScore: 0.9 }],

				// Best Practices: Aim for good practices
				'categories:best-practices': ['warn', { minScore: 0.8 }],

				// SEO: Should be reasonably optimized
				'categories:seo': ['warn', { minScore: 0.8 }],

				// Core Web Vitals thresholds for CesiumJS app
				// LCP: Largest Contentful Paint - allow up to 4s for heavy 3D content
				'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],

				// CLS: Cumulative Layout Shift - keep low (< 0.1 is good)
				'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

				// TBT: Total Blocking Time - allow up to 1000ms for 3D initialization
				'total-blocking-time': ['warn', { maxNumericValue: 1000 }],

				// FCP: First Contentful Paint - aim for under 2s
				'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],

				// Interactive: Time to Interactive - allow up to 6s for CesiumJS
				interactive: ['warn', { maxNumericValue: 6000 }],

				// Speed Index: Visual progress - allow up to 5s
				'speed-index': ['warn', { maxNumericValue: 5000 }],

				// Resource budgets for CesiumJS application
				'resource-summary:script:size': ['warn', { maxNumericValue: 3000000 }], // 3MB JS
				'resource-summary:total:size': ['warn', { maxNumericValue: 5000000 }], // 5MB total

				// Network-related metrics
				'uses-http2': 'off', // localhost doesn't use HTTP/2
				'uses-long-cache-ttl': 'warn',
				// Meaningless against a localhost preview server, which serves
				// no gzip — the audit always fails here regardless of the real
				// build. Measure compression in the real nginx/Envoy deploy.
				'uses-text-compression': 'off',

				// Modern best practices
				'modern-image-formats': 'warn',
				'uses-responsive-images': 'warn',
				'offscreen-images': 'off', // Cesium loads lots of tiles dynamically

				// JavaScript / CSS byte-weight optimization — now measured
				// honestly (heavy binaries are blocked, so no PROTOCOL_TIMEOUT).
				// Surfaced as warnings so regressions are visible without
				// failing CI on Cesium's inherently large bundles.
				'unused-javascript': 'warn',
				'unminified-javascript': 'warn',
				'unminified-css': 'warn',
				// Off: the Lighthouse build ships no source maps (see skipAudits).
				'valid-source-maps': 'off',
				'uses-passive-event-listeners': 'error',
				'no-document-write': 'error',

				// Security
				'is-crawlable': 'warn',
				'robots-txt': 'off', // Not always needed for web apps
			},
		},

		upload: {
			// Use temporary public storage (free, no setup required)
			// Results are available for 7 days via a public URL
			target: 'temporary-public-storage',
		},

		// Server configuration (optional - for Lighthouse CI server)
		// server: {
		//   storage: {
		//     storageMethod: 'filesystem',
		//     storagePath: '.lighthouseci',
		//   },
		// },
	},
};
