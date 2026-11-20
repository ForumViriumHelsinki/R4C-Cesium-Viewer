/**
 * Series colours for the charts that set a selection against a reference (#1162).
 *
 * Every chart that shows both draws the same role in the same colour, so a user who
 * learns which colour is the selection in one chart can read the others:
 *
 * - `focus`: what the user selected or is looking at. The building in
 *   BuildingHeatChart, HSYBuildingHeatChart and BuildingGridChart; the current
 *   area in SocioEconomicsChart.
 * - `baseline`: what it is compared with. The postal-code average in the building
 *   heat charts; the comparison area chosen in SocioEconomicsChart.
 *
 * The keys double as CSS class names on the bars (`bar focus`, `bar baseline`), so
 * a colour value never has to be a valid class name.
 *
 * D3 data colours are exempt from the Vuetify theme variables (code-quality.md,
 * "Exceptions"): the bars are drawn on the plot area's white rectangle in both
 * themes (Plot.createSVGElement), and legend swatches sit on the panel surface
 * (`#ffffff` light, `#1e1e2e` dark). WCAG contrast, measured with the relative
 * luminance formula:
 *
 * | Role     | Colour                | vs white | vs #1e1e2e |
 * | -------- | --------------------- | -------- | ---------- |
 * | focus    | #d95f02 (dark orange) | 3.76:1   | 4.36:1     |
 * | baseline | #4682b4 (steelblue)   | 4.11:1   | 3.99:1     |
 *
 * Both meet the 3:1 that WCAG 1.4.11 asks of graphical objects, on both
 * surfaces; tests/unit/constants/chartColors.test.js checks it. The focus colour
 * was CSS `orange` (1.97:1 on white) until #1162's review. The two roles differ
 * by hue, not lightness (1.09:1 against each other): orange against blue stays
 * apart for the common colour-vision deficiencies, and each bar is also named by
 * its axis label, value label or tooltip, and by the legend. Changing a role's
 * colour here changes it in every chart.
 */

/** @typedef {keyof typeof CHART_SERIES_COLORS} ChartSeriesRole */

export const CHART_SERIES_COLORS = Object.freeze({
	focus: '#d95f02',
	baseline: '#4682b4',
})
