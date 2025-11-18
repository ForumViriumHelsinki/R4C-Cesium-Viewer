// Auto-generated version information
// This file is updated at build time with current version and git commit

export const VERSION_INFO = {
	version: import.meta.env.VITE_APP_VERSION || 'dev',
	commit: import.meta.env.VITE_GIT_COMMIT || 'local',
	buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
};

// Log version info to console
console.log(
	`%c🌍 R4C Cesium Viewer v${VERSION_INFO.version} %c(${VERSION_INFO.commit})`,
	'color: #4CAF50; font-weight: bold; font-size: 14px',
	'color: #666; font-size: 12px'
);
console.log(`Built: ${VERSION_INFO.buildTime}`);
