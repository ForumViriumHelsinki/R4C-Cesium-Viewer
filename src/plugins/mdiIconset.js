import { h } from 'vue'
import { mdi as mdiSvgSet, aliases as svgAliases } from 'vuetify/iconsets/mdi-svg'
import { logger } from '@/utils/logger'
import { MDI_NAME_TO_PATH } from './mdiPaths.js'

/**
 * Custom Vuetify icon set that renders the app's `mdi-*` icons as inline SVG
 * paths from @mdi/js, eliminating the render-blocking Material Design Icons
 * webfont (see #821). Call sites are unchanged — `<v-icon icon="mdi-magnify">`
 * keeps working because Vuetify passes the raw value to this set's component.
 *
 * Vuetify hands the component three value shapes:
 *  - `'mdi-foo'`     — an app icon class → resolve via the generated name→path map
 *  - a raw SVG path  — a Vuetify alias (`$dropdown`, `$clear`, …) already resolved
 *                      to an @mdi/js path by `svgAliases`
 *  - anything else   — passed through untouched
 * Resolution is delegated to Vuetify's own SVG icon component so sizing,
 * layered icons, and accessibility attributes match the stock iconset exactly.
 *
 * The original `mdi-foo` class is preserved on the rendered `<svg>` (via class
 * fallthrough) so existing selectors keep working — the E2E accessibility specs
 * locate controls by `.mdi-refresh`, `.mdi-arrow-left`, `.mdi-compass`, etc.,
 * which the font iconset used to provide on the `<i>` element.
 */
const warned = new Set()

const resolve = (icon) => {
	if (typeof icon !== 'string' || !icon.startsWith('mdi-')) return icon
	const path = MDI_NAME_TO_PATH[icon]
	if (!path && !warned.has(icon)) {
		warned.add(icon)
		logger.warn(
			`[mdiIconset] no SVG path for "${icon}". Add it to src/ and run ` +
				`scripts/generate-mdi-iconset.mjs.`
		)
	}
	return path ?? icon
}

export const mdi = {
	component: (props) => {
		const isName = typeof props.icon === 'string' && props.icon.startsWith('mdi-')
		return h(mdiSvgSet.component, {
			...props,
			icon: resolve(props.icon),
			// Keep the mdi-* class on the <svg> so class-based selectors still match.
			class: isName ? props.icon : undefined,
		})
	},
}

export const aliases = svgAliases
