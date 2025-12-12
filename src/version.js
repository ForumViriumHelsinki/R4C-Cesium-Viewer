/**
 * @module version
 * @description Auto-generated version information module
 * Provides build-time metadata including version, git commit details, and build timestamp.
 * This file is automatically updated during the build process with current version
 * and git commit information from environment variables.
 */

/**
 * Version information object containing build metadata
 * Values are populated at build time from Vite environment variables.
 * Used for debugging, support, and version tracking purposes.
 *
 * @typedef {Object} VersionInfo
 * @property {string} version - Application version from package.json or 'dev' for local builds
 * @property {string} commit - Short git commit hash (7 characters) or 'local' for uncommitted changes
 * @property {string} commitFull - Full git commit hash (40 characters) or 'development' for local builds
 * @property {string} commitDate - ISO 8601 timestamp of the commit or current time for local builds
 * @property {string} branch - Git branch name or 'local' for local builds
 * @property {string} buildTime - ISO 8601 timestamp when the build was created
 *
 * @example
 * import { VERSION_INFO } from './version.js';
 * console.log(`Running version ${VERSION_INFO.version}`);
 * console.log(`Built from commit ${VERSION_INFO.commit} on ${VERSION_INFO.branch}`);
 */
export const VERSION_INFO = {
	version: import.meta.env.VITE_APP_VERSION || 'dev',
	commit: import.meta.env.VITE_GIT_COMMIT || 'local',
	commitFull: import.meta.env.VITE_GIT_COMMIT_FULL || 'development',
	commitDate: import.meta.env.VITE_GIT_COMMIT_DATE || new Date().toISOString(),
	branch: import.meta.env.VITE_GIT_BRANCH || 'local',
	buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
}

// Log version info to console for debugging and support purposes
console.log(
	`%c🌍 R4C Cesium Viewer v${VERSION_INFO.version} %c(${VERSION_INFO.commit})`,
	'color: #4CAF50; font-weight: bold; font-size: 14px',
	'color: #666; font-size: 12px'
)
console.log(`Built: ${VERSION_INFO.buildTime}`)
