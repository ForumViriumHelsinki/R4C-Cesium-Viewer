/**
 * @module utils/haptics
 *
 * Vibration API wrapper. Chrome blocks `navigator.vibrate` until the user has
 * interacted with the page and logs an intervention for every blocked call
 * (#1229), so the call is skipped until user activation is known to have
 * happened. Browsers without `navigator.userActivation` get no vibration.
 */

/**
 * Vibrate the device if the page is allowed to.
 *
 * @param {number|number[]} pattern - Vibration pattern in milliseconds
 * @returns {boolean} true if a vibration was requested and accepted
 */
export function hapticPulse(pattern) {
	if (typeof navigator === 'undefined') return false
	if (typeof navigator.vibrate !== 'function') return false
	if (!navigator.userActivation?.hasBeenActive) return false
	return navigator.vibrate(pattern)
}
