// Re-exports only the d3 symbols the app actually uses, pulled from individual
// d3 submodules instead of the `d3` meta-package, so the bundle never pulls
// unused d3 modules. Import as a namespace to keep call sites unchanged:
//   import * as d3 from '@/utils/d3'
//   d3.select(...), d3.scaleLinear(...), d3.histogram(...)

export { bin as histogram, max, min } from 'd3-array'
export { axisBottom, axisLeft } from 'd3-axis'
export type { ScaleLinear } from 'd3-scale'
export { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
export { schemeCategory10 } from 'd3-scale-chromatic'
// Types referenced in JSDoc (`@param {d3.Selection}`, `{d3.ScaleLinear}`).
export type { Selection } from 'd3-selection'
export { select } from 'd3-selection'
export { arc, pie } from 'd3-shape'
