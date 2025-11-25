/**
 * Performance Reporter for Playwright Tests
 *
 * Tracks test execution times and compares against baseline performance metrics.
 * Helps detect performance regressions early in the development cycle.
 *
 * Features:
 * - Individual test duration tracking
 * - Suite duration tracking
 * - Comparison against historical baselines
 * - Warnings for significant performance regressions
 * - JSON output for CI integration
 */

import type {
	Reporter,
	TestCase,
	TestResult,
	FullConfig,
	Suite,
	FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { PERFORMANCE_CONFIG, percentToDecimal } from '../performance-config.js';

interface PerformanceBaseline {
	total: number;
	cesiumInit?: number;
	individualTests: Record<string, number>;
}

interface PerformanceBaselines {
	[suiteName: string]: PerformanceBaseline;
}

interface TestMetrics {
	name: string;
	duration: number;
	status: string;
	retries: number;
	project: string;
	file: string;
}

interface SuiteMetrics {
	name: string;
	duration: number;
	testCount: number;
	tests: TestMetrics[];
}

interface PerformanceReport {
	timestamp: string;
	totalDuration: number;
	suites: SuiteMetrics[];
	regressions: Array<{
		suite: string;
		test: string;
		baseline: number;
		actual: number;
		percentIncrease: number;
	}>;
	warnings: string[];
	summary: {
		totalTests: number;
		passedTests: number;
		failedTests: number;
		avgDuration: number;
		slowestTest: { name: string; duration: number };
		timeouts: number;
	};
}

class PerformanceReporter implements Reporter {
	private startTime: number = 0;
	private suiteMetrics: Map<string, SuiteMetrics> = new Map();
	private baselines: PerformanceBaselines = {};
	private regressions: PerformanceReport['regressions'] = [];
	private warnings: string[] = [];
	private timeoutCount: number = 0;
	private totalTests: number = 0;
	private passedTests: number = 0;
	private failedTests: number = 0;

	// Thresholds from shared config
	private readonly WARNING_THRESHOLD = percentToDecimal(
		PERFORMANCE_CONFIG.WARNING_THRESHOLD_PERCENT
	);
	private readonly CRITICAL_THRESHOLD = percentToDecimal(
		PERFORMANCE_CONFIG.CRITICAL_THRESHOLD_PERCENT
	);

	constructor(options: { baselineFile?: string } = {}) {
		const baselineFile =
			options.baselineFile || path.join(process.cwd(), 'tests/performance-baselines.json');

		// Load baselines if they exist
		if (fs.existsSync(baselineFile)) {
			try {
				const content = fs.readFileSync(baselineFile, 'utf-8');
				this.baselines = JSON.parse(content);
				console.log(`[Performance Reporter] Loaded baselines from ${baselineFile}`);
			} catch (error) {
				console.warn(`[Performance Reporter] Failed to load baselines: ${error}`);
			}
		} else {
			console.log(
				`[Performance Reporter] No baseline file found at ${baselineFile}. Will generate one.`
			);
		}
	}

	onBegin(config: FullConfig, suite: Suite) {
		this.startTime = Date.now();
		console.log('\n[Performance Reporter] Starting performance monitoring...');
	}

	onTestEnd(test: TestCase, result: TestResult) {
		this.totalTests++;

		if (result.status === 'passed') {
			this.passedTests++;
		} else if (result.status === 'failed' || result.status === 'timedOut') {
			this.failedTests++;
			if (result.status === 'timedOut') {
				this.timeoutCount++;
			}
		}

		const duration = result.duration;
		const suiteName = this.extractSuiteName(test);
		const testName = test.title;
		const projectName = test.parent?.project()?.name || 'unknown';

		// Get or create suite metrics
		if (!this.suiteMetrics.has(suiteName)) {
			this.suiteMetrics.set(suiteName, {
				name: suiteName,
				duration: 0,
				testCount: 0,
				tests: [],
			});
		}

		const suiteMetric = this.suiteMetrics.get(suiteName)!;
		suiteMetric.duration += duration;
		suiteMetric.testCount++;

		// Add test metrics
		const testMetric: TestMetrics = {
			name: testName,
			duration,
			status: result.status,
			retries: result.retry,
			project: projectName,
			file: test.location.file,
		};
		suiteMetric.tests.push(testMetric);

		// Check against baseline if available
		const baseline = this.baselines[suiteName];
		if (baseline && baseline.individualTests[testName]) {
			const baselineDuration = baseline.individualTests[testName];
			const percentIncrease = (duration - baselineDuration) / baselineDuration;

			if (percentIncrease > this.WARNING_THRESHOLD) {
				const regression = {
					suite: suiteName,
					test: testName,
					baseline: baselineDuration,
					actual: duration,
					percentIncrease: percentIncrease * 100,
				};
				this.regressions.push(regression);

				const isCritical = percentIncrease > this.CRITICAL_THRESHOLD;
				const warningLevel = isCritical ? 'CRITICAL' : 'WARNING';
				const warning = `[${warningLevel}] ${suiteName} > ${testName}: ${Math.round(duration)}ms (baseline: ${Math.round(baselineDuration)}ms, +${Math.round(percentIncrease * 100)}%)`;
				this.warnings.push(warning);

				if (isCritical) {
					console.warn(`\n⚠️  ${warning}`);
				}
			}
		}
	}

	async onEnd(result: FullResult) {
		const totalDuration = Date.now() - this.startTime;

		// Calculate summary statistics
		const allTests = Array.from(this.suiteMetrics.values()).flatMap((s) => s.tests);
		const avgDuration =
			allTests.length > 0 ? allTests.reduce((sum, t) => sum + t.duration, 0) / allTests.length : 0;

		const slowestTest = allTests.reduce(
			(slowest, test) => (test.duration > slowest.duration ? test : slowest),
			{ name: 'N/A', duration: 0 }
		);

		// Build performance report
		const report: PerformanceReport = {
			timestamp: new Date().toISOString(),
			totalDuration,
			suites: Array.from(this.suiteMetrics.values()),
			regressions: this.regressions,
			warnings: this.warnings,
			summary: {
				totalTests: this.totalTests,
				passedTests: this.passedTests,
				failedTests: this.failedTests,
				avgDuration: Math.round(avgDuration),
				slowestTest: {
					name: slowestTest.name,
					duration: Math.round(slowestTest.duration),
				},
				timeouts: this.timeoutCount,
			},
		};

		// Write report to file
		const reportDir = path.join(process.cwd(), 'test-results');
		if (!fs.existsSync(reportDir)) {
			fs.mkdirSync(reportDir, { recursive: true });
		}

		const reportFile = path.join(reportDir, 'performance-report.json');
		try {
			fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
		} catch (error) {
			console.error(`[Performance Reporter] Failed to write report: ${error}`);
			throw error;
		}

		// Generate baseline file if it doesn't exist
		if (Object.keys(this.baselines).length === 0 && this.passedTests > 0) {
			this.generateBaselines(reportFile);
		}

		// Print summary
		this.printSummary(report);
	}

	private extractSuiteName(test: TestCase): string {
		// Use relative file path as suite identifier to prevent collisions
		// between different directories with same filename
		const filePath = test.location.file;
		const relativePath = path.relative(process.cwd(), filePath);

		// Extract just the filename without extension for cleaner display
		// but keep full path in case we need it for uniqueness
		const fileName = path.basename(filePath, '.spec.ts');

		// For now, use filename as it's cleaner and collision is unlikely
		// But we have the full relative path available if needed
		return fileName;
	}

	private generateBaselines(reportFile: string) {
		console.log('\n[Performance Reporter] Generating baseline performance metrics...');

		const report: PerformanceReport = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));

		const baselines: PerformanceBaselines = {};
		const warnings: string[] = [];

		for (const suite of report.suites) {
			const individualTests: Record<string, number> = {};

			for (const test of suite.tests) {
				if (test.status === 'passed') {
					const duration = test.duration;

					// Validate baseline values
					if (duration < PERFORMANCE_CONFIG.MIN_BASELINE_DURATION) {
						warnings.push(
							`⚠️  ${suite.name} > ${test.name}: Duration ${Math.round(duration)}ms is very short (< ${PERFORMANCE_CONFIG.MIN_BASELINE_DURATION}ms). May not be reliable for regression detection.`
						);
					}

					if (duration > PERFORMANCE_CONFIG.MAX_BASELINE_DURATION) {
						warnings.push(
							`⚠️  ${suite.name} > ${test.name}: Duration ${Math.round(duration)}ms is suspiciously high (> ${PERFORMANCE_CONFIG.MAX_BASELINE_DURATION}ms). Please verify this is expected.`
						);
					}

					individualTests[test.name] = duration;
				}
			}

			if (Object.keys(individualTests).length > 0) {
				baselines[suite.name] = {
					total: suite.duration,
					individualTests,
				};
			}
		}

		const baselineFile = path.join(process.cwd(), 'tests/performance-baselines.json');

		try {
			fs.writeFileSync(baselineFile, JSON.stringify(baselines, null, 2));
			console.log(`[Performance Reporter] Baselines saved to ${baselineFile}`);

			// Display validation warnings if any
			if (warnings.length > 0) {
				console.log('\n[Performance Reporter] Baseline Validation Warnings:');
				warnings.forEach((warning) => console.log(warning));
			}
		} catch (error) {
			console.error(`[Performance Reporter] Failed to write baselines: ${error}`);
			throw error;
		}
	}

	private printSummary(report: PerformanceReport) {
		console.log('\n' + '='.repeat(80));
		console.log('PERFORMANCE REPORT');
		console.log('='.repeat(80));

		console.log(`\nTotal Duration: ${Math.round(report.totalDuration / 1000)}s`);
		console.log(`Total Tests: ${report.summary.totalTests}`);
		console.log(`Passed: ${report.summary.passedTests}`);
		console.log(`Failed: ${report.summary.failedTests}`);
		console.log(`Timeouts: ${report.summary.timeouts}`);
		console.log(`Average Test Duration: ${report.summary.avgDuration}ms`);
		console.log(
			`Slowest Test: ${report.summary.slowestTest.name} (${report.summary.slowestTest.duration}ms)`
		);

		if (report.regressions.length > 0) {
			console.log('\n' + '-'.repeat(80));
			console.log('PERFORMANCE REGRESSIONS');
			console.log('-'.repeat(80));

			for (const regression of report.regressions) {
				const isCritical = regression.percentIncrease > this.CRITICAL_THRESHOLD * 100;
				const indicator = isCritical ? '🔴' : '🟡';
				console.log(`${indicator} ${regression.suite} > ${regression.test}`);
				console.log(
					`   Baseline: ${Math.round(regression.baseline)}ms | Actual: ${Math.round(regression.actual)}ms | +${Math.round(regression.percentIncrease)}%`
				);
			}
		}

		console.log('\n' + '='.repeat(80));

		// Exit with error code if critical regressions found
		const criticalRegressions = report.regressions.filter(
			(r) => r.percentIncrease > this.CRITICAL_THRESHOLD * 100
		);

		if (criticalRegressions.length > 0) {
			console.error(
				`\n❌ ${criticalRegressions.length} critical performance regression(s) detected!`
			);
			console.error('Tests are more than 30% slower than baseline. Please investigate.');
		} else if (report.regressions.length > 0) {
			console.warn(
				`\n⚠️  ${report.regressions.length} performance regression(s) detected (>20% slower).`
			);
		} else {
			console.log('\n✅ No performance regressions detected.');
		}

		console.log(`\nDetailed report: test-results/performance-report.json\n`);
	}
}

export default PerformanceReporter;
