/**
 * Visibility change logger for debugging blinking issues
 *
 * This utility captures every visibility change with timestamps and caller info
 * to help identify what's causing building/tree visibility blinking.
 *
 * Usage:
 *   import { logVisibilityChange } from './visibilityLogger';
 *   logVisibilityChange('datasource', postalCode, oldValue, newValue, 'functionName');
 *
 * Console commands:
 *   window.visibilityLog.getLog()   - Get all logged entries
 *   window.visibilityLog.clear()    - Clear the log
 *   window.visibilityLog.analyze()  - Analyze for blinking patterns
 *   window.visibilityLog.setLogging(false) - Disable logging
 */

const visibilityLog = [];
let isLogging = true;
let maxLogSize = 1000; // Prevent memory issues

/**
 * Log a visibility change event
 * @param {string} type - Type of entity: 'entity', 'datasource', 'tileset', 'layer'
 * @param {string} name - Name/identifier of the entity
 * @param {boolean} oldValue - Previous visibility state
 * @param {boolean} newValue - New visibility state
 * @param {string} source - What triggered this change (function name or description)
 */
export function logVisibilityChange(type, name, oldValue, newValue, source) {
	if (!isLogging) return;
	if (oldValue === newValue) return; // Only log actual changes

	const entry = {
		timestamp: performance.now().toFixed(2),
		isoTime: new Date().toISOString(),
		type,
		name,
		from: oldValue,
		to: newValue,
		source,
		stack: new Error().stack.split('\n').slice(2, 6).join('\n'), // Caller info
	};

	visibilityLog.push(entry);

	// Trim log if it gets too large
	if (visibilityLog.length > maxLogSize) {
		visibilityLog.splice(0, 100);
	}

	// Log to console with color coding
	const color = newValue ? 'color: green' : 'color: red';
	console.log(
		`%c[VISIBILITY] ${entry.timestamp}ms | ${type} "${name}" | ${oldValue} → ${newValue} | ${source}`,
		color
	);
}

/**
 * Log a batch visibility change (for multiple entities at once)
 * @param {string} type - Type of entities
 * @param {number} count - Number of entities affected
 * @param {boolean} newValue - New visibility state
 * @param {string} source - What triggered this change
 */
export function logBatchVisibilityChange(type, count, newValue, source) {
	if (!isLogging) return;

	const entry = {
		timestamp: performance.now().toFixed(2),
		isoTime: new Date().toISOString(),
		type: `batch-${type}`,
		name: `${count} items`,
		from: null,
		to: newValue,
		source,
		stack: new Error().stack.split('\n').slice(2, 6).join('\n'),
	};

	visibilityLog.push(entry);

	const color = newValue ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold';
	console.log(
		`%c[VISIBILITY BATCH] ${entry.timestamp}ms | ${count} ${type}(s) | → ${newValue} | ${source}`,
		color
	);
}

/**
 * Get all visibility log entries
 * @returns {Array} Array of log entries
 */
export function getVisibilityLog() {
	return [...visibilityLog];
}

/**
 * Clear all visibility log entries
 */
export function clearVisibilityLog() {
	visibilityLog.length = 0;
	console.log('%c[VISIBILITY] Log cleared', 'color: blue');
}

/**
 * Enable or disable visibility logging
 * @param {boolean} enabled - Whether to enable logging
 */
export function setLogging(enabled) {
	isLogging = enabled;
	console.log(`%c[VISIBILITY] Logging ${enabled ? 'enabled' : 'disabled'}`, 'color: blue');
}

/**
 * Check if logging is currently enabled
 * @returns {boolean}
 */
export function isLoggingEnabled() {
	return isLogging;
}

/**
 * Set maximum log size
 * @param {number} size - Maximum number of entries to keep
 */
export function setMaxLogSize(size) {
	maxLogSize = size;
}

/**
 * Analyze the visibility log for blinking patterns
 * Blinking is detected when an entity changes visibility multiple times rapidly
 */
export function analyzeBlinking(timeWindowMs = 5000) {
	const grouped = {};

	visibilityLog.forEach((entry) => {
		const key = `${entry.type}:${entry.name}`;
		if (!grouped[key]) grouped[key] = [];
		grouped[key].push(entry);
	});

	console.log('%c=== VISIBILITY ANALYSIS ===', 'color: blue; font-weight: bold; font-size: 14px');

	const blinkingEntities = [];

	Object.entries(grouped).forEach(([key, entries]) => {
		// Check for rapid changes within time window
		if (entries.length >= 2) {
			const firstTime = parseFloat(entries[0].timestamp);
			const lastTime = parseFloat(entries[entries.length - 1].timestamp);

			if (lastTime - firstTime < timeWindowMs) {
				blinkingEntities.push({ key, entries, duration: lastTime - firstTime });
			}
		}
	});

	if (blinkingEntities.length === 0) {
		console.log('%cNo blinking detected', 'color: green');
		return;
	}

	// Sort by number of changes (most problematic first)
	blinkingEntities.sort((a, b) => b.entries.length - a.entries.length);

	blinkingEntities.forEach(({ key, entries, duration }) => {
		console.warn(
			`%cBLINKING DETECTED: ${key} changed ${entries.length} times in ${duration.toFixed(0)}ms`,
			'color: orange; font-weight: bold'
		);

		// Show the sequence of changes
		console.group('Change sequence:');
		entries.forEach((e) => {
			console.log(
				`%c${e.timestamp}ms: ${e.from} → ${e.to} (${e.source})`,
				e.to ? 'color: green' : 'color: red'
			);
		});
		console.groupEnd();

		// Show unique sources that triggered changes
		const sources = [...new Set(entries.map((e) => e.source))];
		console.log('Sources:', sources.join(', '));

		// Show stack trace of first occurrence
		console.group('First occurrence stack:');
		console.log(entries[0].stack);
		console.groupEnd();
	});

	return blinkingEntities;
}

/**
 * Get a summary of visibility changes
 * @returns {Object} Summary statistics
 */
export function getVisibilitySummary() {
	const summary = {
		totalChanges: visibilityLog.length,
		byType: {},
		bySource: {},
		showCount: 0,
		hideCount: 0,
	};

	visibilityLog.forEach((entry) => {
		// Count by type
		if (!summary.byType[entry.type]) summary.byType[entry.type] = 0;
		summary.byType[entry.type]++;

		// Count by source
		if (!summary.bySource[entry.source]) summary.bySource[entry.source] = 0;
		summary.bySource[entry.source]++;

		// Count show/hide
		if (entry.to) summary.showCount++;
		else summary.hideCount++;
	});

	return summary;
}

/**
 * Export log as JSON for external analysis
 * @returns {string} JSON string of log entries
 */
export function exportLog() {
	return JSON.stringify(visibilityLog, null, 2);
}

/**
 * Find entries matching a filter
 * @param {Object} filter - Filter criteria
 * @returns {Array} Matching entries
 */
export function findEntries(filter = {}) {
	return visibilityLog.filter((entry) => {
		if (filter.type && entry.type !== filter.type) return false;
		if (filter.name && !entry.name.includes(filter.name)) return false;
		if (filter.source && !entry.source.includes(filter.source)) return false;
		if (filter.to !== undefined && entry.to !== filter.to) return false;
		return true;
	});
}

// Make available globally for console access
if (typeof window !== 'undefined') {
	window.visibilityLog = {
		getLog: getVisibilityLog,
		clear: clearVisibilityLog,
		analyze: analyzeBlinking,
		summary: getVisibilitySummary,
		export: exportLog,
		find: findEntries,
		setLogging,
		isLogging: isLoggingEnabled,
	};

	console.log(
		'%c[VISIBILITY LOGGER] Initialized. Use window.visibilityLog.analyze() to check for blinking.',
		'color: blue; font-style: italic'
	);
}
