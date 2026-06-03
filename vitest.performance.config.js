import baseConfig from './vitest.config.js';

// Dedicated config for the performance suite.
//
// The performance tests drive a real Chromium instance against a running
// preview/dev server, so they are slow and resource-intensive. Keeping them out
// of the default `vitest.config.js` `include` ensures bare `vitest`, `test:watch`
// and `test:coverage` stay fast and server-free. This config narrows discovery to
// `tests/performance/**` so `vitest run --config vitest.performance.config.js`
// (wired as `test:performance`) finds them — a bare path filter alone does not,
// because Vitest only filters files already matched by `include`.
export default {
	...baseConfig,
	test: {
		...baseConfig.test,
		// Perf tests drive a real Chromium via Playwright, not in-process Vue
		// component tests — so skip the JSDOM environment and the unit-test
		// setup. `setup.js` also touches `window` at module load, which throws
		// under `environment: 'node'`, so the two must change together. `exclude`
		// is inherited from `baseConfig.test` via the spread above.
		environment: 'node',
		setupFiles: [],
		include: ['tests/performance/**/*.test.{js,ts}'],
	},
};
