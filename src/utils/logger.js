/**
 * Development Logger Utility
 *
 * Provides environment-aware logging that is automatically gated in production.
 * Ensures verbose debugging output is available during development without
 * cluttering production console or exposing sensitive information.
 *
 * Usage:
 *   import logger from './utils/logger.js';
 *
 *   logger.debug('Detailed debugging info');  // DEV only
 *   logger.log('General logging');            // DEV only
 *   logger.info('Important info');            // Always shown
 *   logger.warn('Warning message');           // Always shown
 *   logger.error('Error message');            // Always shown
 *   logger.styled('Custom styled', 'color: blue'); // DEV only
 *
 * @module utils/logger
 */

const isDev = import.meta.env.DEV;

export const logger = {
	/**
	 * Debug-level logging (DEV only)
	 * Use for detailed debugging information that helps during development
	 */
	debug: (...args) => isDev && console.debug('[DEBUG]', ...args),

	/**
	 * General logging (DEV only)
	 * Use for general development logging
	 */
	log: (...args) => isDev && console.log(...args),

	/**
	 * Info-level logging (always shown)
	 * Use for important information that should be visible in production
	 */
	info: (...args) => console.info(...args),

	/**
	 * Warning-level logging (always shown)
	 * Use for warnings that should be tracked in production
	 */
	warn: (...args) => console.warn(...args),

	/**
	 * Error-level logging (always shown)
	 * Use for errors that should be tracked in production
	 */
	error: (...args) => console.error(...args),

	/**
	 * Styled console logging (DEV only)
	 * Use for custom styled logging with CSS
	 * @param {string} message - Message to log
	 * @param {string} style - CSS style string
	 */
	styled: (message, style) => isDev && console.log(`%c${message}`, style),
};

export default logger;
