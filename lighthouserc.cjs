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

			// Test URL - preview server runs on port 4173 by default
			url: ['http://localhost:4173/'],

			// Number of runs for each URL to get median values
			numberOfRuns: 3,

			// Additional settings for more accurate measurements
			settings: {
				// Lighthouse preset
				preset: 'desktop',

				// Disable throttling for CI environment
				// (GitHub Actions runners are already slower than local dev)
				throttling: {
					rttMs: 40,
					throughputKbps: 10240,
					cpuSlowdownMultiplier: 1,
				},

				// Skip PWA and some unused audits to speed up CI
				skipAudits: [
					'is-on-https', // CI runs on localhost
					'service-worker',
					'installable-manifest',
					'splash-screen',
					'themed-omnibox',
					'maskable-icon',
					'apple-touch-icon',
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
				'uses-text-compression': 'error',

				// Modern best practices
				'modern-image-formats': 'warn',
				'uses-responsive-images': 'warn',
				'offscreen-images': 'off', // Cesium loads lots of tiles dynamically

				// JavaScript optimization
				'unused-javascript': 'off', // Cesium bundles are optimized but large
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

			// Optionally store results in filesystem for archival
			// outputDir: '.lighthouseci',
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
