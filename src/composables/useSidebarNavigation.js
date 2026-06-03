import { computed } from 'vue'
import { useGlobalStore } from '../stores/globalStore.js'
import logger from '../utils/logger.js'

/**
 * Composable for sidebar breadcrumb navigation.
 * Generates breadcrumb trail based on current navigation level
 * and provides navigation actions for back/home.
 */
export function useSidebarNavigation() {
	const globalStore = useGlobalStore()

	const currentLevel = computed(() => globalStore.level)
	// Store property is `postalcode` (lowercase) — reading `postalCode` (camelCase)
	// resolved to `undefined` and rendered as the literal string "undefined" in the
	// sidebar breadcrumb (issue #711).
	const postalCode = computed(() => globalStore.postalcode)
	const nameOfZone = computed(() => globalStore.nameOfZone)
	const buildingAddress = computed(() => globalStore.buildingAddress)

	const breadcrumbs = computed(() => {
		const items = [{ label: 'Capital Region', level: 'start' }]

		if (currentLevel.value === 'postalCode' || currentLevel.value === 'building') {
			const postalLabel = [postalCode.value, nameOfZone.value].filter(Boolean).join(' ') || 'Area'
			items.push({ label: postalLabel, level: 'postalCode' })
		}

		if (currentLevel.value === 'building') {
			items.push({
				label: buildingAddress.value || 'Building',
				level: 'building',
			})
		}

		return items
	})

	const canGoBack = computed(() => currentLevel.value !== 'start')

	const goBack = async () => {
		if (currentLevel.value === 'building') {
			const [{ default: Featurepicker }, { default: Tree }] = await Promise.all([
				import('../services/featurepicker'),
				import('../services/tree'),
			])
			const featurepicker = new Featurepicker()
			const { useToggleStore } = await import('../stores/toggleStore.js')
			const toggleStore = useToggleStore()
			const tooltip = /** @type {HTMLElement|null} */ (document.querySelector('.tooltip'))
			if (tooltip) tooltip.style.display = 'none'
			featurepicker.loadPostalCode().catch((error) => {
				logger.error('Failed to load postal code:', error)
			})
			if (toggleStore.showTrees) {
				const treeService = new Tree()
				treeService.loadTrees().catch((error) => {
					logger.error('Failed to load trees:', error)
				})
			}
		} else if (currentLevel.value === 'postalCode') {
			await goHome()
		}
	}

	const goHome = async () => {
		const { default: Building } = await import('../services/building')
		const buildingService = new Building()
		buildingService.cancelCurrentLoad()

		const { useBuildingStore } = await import('../stores/buildingStore.js')
		const buildingStore = useBuildingStore()
		buildingStore.clearBuildingFeatures()

		const { useToggleStore } = await import('../stores/toggleStore.js')
		const toggleStore = useToggleStore()
		toggleStore.onExitPostalCode()

		globalStore.setLevel('start')
		// Reset to cleared state — store setters accept null at runtime to clear selection.
		globalStore.setPostalCode(/** @type {string} */ (/** @type {unknown} */ (null)))
		globalStore.setNameOfZone(/** @type {string} */ (/** @type {unknown} */ (null)))
		globalStore.setView('capitalRegion')

		toggleStore.setShowTrees(false)
		toggleStore.setShowPlot(true)
		toggleStore.setGridView(false)
		toggleStore.setHelsinkiView(false)

		const { default: Camera } = await import('../services/camera')
		const camera = new Camera()
		camera.init()

		const tooltip = /** @type {HTMLElement|null} */ (document.querySelector('.tooltip'))
		if (tooltip) tooltip.style.display = 'none'
	}

	return {
		breadcrumbs,
		canGoBack,
		currentLevel,
		goBack,
		goHome,
	}
}
