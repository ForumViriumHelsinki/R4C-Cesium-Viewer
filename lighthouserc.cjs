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
			// Build the production bundle and start preview server
			startServerCommand: 'bun run preview',

			// Pattern to detect when server is ready
			// Vite outputs: "➜  Local:   http://localhost:4173/"
			// Default pattern is /listen|ready/i which doesn't match Vite's output
			startServerReadyPattern: 'Local:',

			// Timeout for server startup (ms) - allow extra time for CI
			startServerReadyTimeout: 30000,

			// Test URL - preview server runs on port 4173 by default
			url: ['http://localhost:4173/'],

			// Number of runs for each URL
			// Reduced from 3 to 1 to decrease probability of PROTOCOL_TIMEOUT
			// CesiumJS is too heavy for multiple runs in CI without timeouts
			numberOfRuns: 1,

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

				// Block heavy terrain and tile requests that cause PROTOCOL_TIMEOUT
				// The DevTools Protocol times out (30s hardcoded) when trying to get
				// response bodies for large terrain tiles and 3D data
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
					// External map tile services that load many requests
					'**/tile/**',
					'**/tiles/**',
					// Ion/Cesium cloud assets
					'*assets.cesium.com*',
					'*ion.cesium.com*',
				],

				// Skip audits that require response body inspection (cause PROTOCOL_TIMEOUT)
				// and PWA audits not relevant for this app
				skipAudits: [
					'is-on-https', // CI runs on localhost
					'service-worker',
					'installable-manifest',
					'splash-screen',
					'themed-omnibox',
					'maskable-icon',
					'apple-touch-icon',
					// Skip audits that inspect large response bodies
					'uses-text-compression', // Needs to read compressed response bodies
					'unminified-javascript', // Needs to parse all JS content
					'unminified-css', // Needs to parse all CSS content
					'unused-javascript', // Already disabled in assertions, skip here too
					'valid-source-maps', // Can timeout reading large source maps
				],
			},
		},

		assert: {
			preset: 'lighthouse:recommended',

			assertions: {
				// Performance: CesiumJS is heavy (~2-3MB core + assets)
				// Realistic target is 0.5-0.6 for initial load
				'categories:performance': ['warn', { minScore: 0.5 }],

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
				'uses-text-compression': 'off', // Skipped to avoid PROTOCOL_TIMEOUT

				// Modern best practices
				'modern-image-formats': 'warn',
				'uses-responsive-images': 'warn',
				'offscreen-images': 'off', // Cesium loads lots of tiles dynamically

				// JavaScript optimization (some skipped to avoid PROTOCOL_TIMEOUT)
				'unused-javascript': 'off', // Cesium bundles are optimized but large
				'unminified-javascript': 'off', // Skipped to avoid PROTOCOL_TIMEOUT
				'unminified-css': 'off', // Skipped to avoid PROTOCOL_TIMEOUT
				'valid-source-maps': 'off', // Skipped to avoid PROTOCOL_TIMEOUT on large maps
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
