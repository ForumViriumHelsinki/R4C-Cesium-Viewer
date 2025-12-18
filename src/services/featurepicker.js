/**
 * FeaturePicker Service
 *
 * Re-exports from the refactored featurepicker module for backward compatibility.
 * The actual implementation is now split into focused modules under ./featurepicker/
 *
 * @module services/featurepicker
 * @see module:services/featurepicker/index
 */

// Re-export default FeaturePicker class for backward compatibility
export { default } from './featurepicker/index.js'
