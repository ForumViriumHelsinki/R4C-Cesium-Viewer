/**
 * @module utils/deckglLayerRegistry
 *
 * Registry of deck.gl layer factories for the deck.gl map renderer. Each layer
 * type (WMS imagery, grid, postal codes, buildings, …) registers one entry:
 * `isActive(ctx)` decides from store state whether it shows, `build(ctx)`
 * returns its deck layer(s). The map host rebuilds the stack from the registry
 * whenever state changes; deck.gl diffs layers by id, so rebuilding is cheap.
 *
 * Kept free of deck.gl imports: factories receive the lazily imported deck
 * modules through `ctx.modules`, so the registry is unit-testable and the
 * deck.gl bundle stays out of the entry chunk.
 */

/**
 * @template Ctx
 * @typedef {Object} DeckLayerDefinition
 * @property {string} id - unique id; also the prefix of the deck layer ids it builds
 * @property {number} order - stacking order, bottom (low) to top (high)
 * @property {(ctx: Ctx) => boolean} isActive
 * @property {(ctx: Ctx) => unknown | unknown[] | null} build
 */

/**
 * @param {Object} [options]
 * @param {(id: string, error: unknown) => void} [options.onError] - called when a factory throws
 */
export function createDeckLayerRegistry({ onError = () => {} } = {}) {
	/** @type {Map<string, DeckLayerDefinition<any>>} */
	const definitions = new Map()

	return {
		/**
		 * @param {DeckLayerDefinition<any>} definition
		 * @returns {() => void} unregister
		 */
		register(definition) {
			if (definitions.has(definition.id)) {
				throw new Error(`deck.gl layer "${definition.id}" is already registered`)
			}
			definitions.set(definition.id, definition)
			return () => {
				if (definitions.get(definition.id) === definition) definitions.delete(definition.id)
			}
		},

		/** @param {string} id */
		has(id) {
			return definitions.has(id)
		},

		ids() {
			return [...definitions.keys()]
		},

		/**
		 * Build the ordered deck layer stack. A factory that throws is skipped
		 * and reported, so one broken layer cannot blank the whole map.
		 * @param {any} ctx
		 * @returns {unknown[]}
		 */
		buildLayers(ctx) {
			const sorted = [...definitions.values()].sort((a, b) => a.order - b.order)
			const layers = []
			for (const def of sorted) {
				try {
					if (!def.isActive(ctx)) continue
					const built = def.build(ctx)
					if (built == null) continue
					for (const layer of Array.isArray(built) ? built : [built]) {
						if (layer != null) layers.push(layer)
					}
				} catch (error) {
					onError(def.id, error)
				}
			}
			return layers
		},
	}
}
