/**
 * Event Emitter Service
 * Provides a global event bus for application-wide event-driven communication.
 * Uses mitt library for lightweight pub/sub pattern implementation.
 *
 * @module eventEmitter
 * @see {@link https://github.com/developit/mitt|mitt documentation}
 *
 * @example
 * // Emit an event
 * eventBus.emit('dataLoaded', { data: results });
 *
 * @example
 * // Listen to an event
 * eventBus.on('dataLoaded', (payload) => {
 *   console.log(payload.data);
 * });
 *
 * @example
 * // Remove event listener
 * const handler = (data) => console.log(data);
 * eventBus.on('event', handler);
 * eventBus.off('event', handler);
 */
import mitt from "mitt";

/**
 * Global event bus instance
 * Singleton mitt instance used throughout the application for event communication.
 *
 * Common events:
 * - 'newBuildingHeat' - Emitted when building heat data is updated
 * - 'newHeatHistogram' - Emitted when heat histogram data changes
 * - 'entityPrintEvent' - Emitted when an entity is selected for printing
 *
 * @type {import('mitt').Emitter}
 */
export const eventBus = mitt();
