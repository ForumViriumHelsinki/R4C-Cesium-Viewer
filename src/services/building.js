/**
 * Building Service
 *
 * Re-exports from the refactored building module for backward compatibility.
 * The actual implementation is now split into focused modules under ./building/
 *
 * @module services/building
 * @see module:services/building/index
 */

// Re-export default Building class for backward compatibility
// Re-export named exports for consumers who need specific modules
export {
	BuildingFilter,
	BuildingHighlighter,
	BuildingLoader,
	BuildingStyler,
	default,
	filterHeatTimeseries,
} from './building/index.js'
