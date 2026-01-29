<template>
	<div id="printContainer">
		<i>Please click on areas to retrieve more information</i>
	</div>
</template>

<script>
import { onBeforeUnmount, onMounted } from 'vue'
import { getCesium } from '../services/cesiumProvider.js'
import { eventBus } from '../services/eventEmitter.js'
import { useGlobalStore } from '../stores/globalStore.js'

export default {
	setup() {
		const store = useGlobalStore()

		const entityPrint = () => {
			const entity = store.pickedEntity

			if (entity?._polygon && entity?.properties) {
				document.getElementById('printContainer').scroll({
					top: 0,
					behavior: 'instant',
				})

				// Highlight the clicked entity for 5 seconds
				const Cesium = getCesium()
				const oldMaterial = entity.polygon.material
				entity.polygon.material = new Cesium.Color(1, 0.5, 0.5, 0.8)
				setTimeout(() => {
					entity.polygon.material = oldMaterial
				}, 5000)

				printEntity(entity, entity.properties.posno, store.view)
			}
		}

		const geocodingPrint = () => {
			const store = useGlobalStore()
			store.cesiumViewer.dataSources._dataSources.forEach((dataSource) => {
				if (dataSource.name === 'PostCodes') {
					findPostalcodeEntity(dataSource, store.postalcode)
				}
			})
		}

		const findPostalcodeEntity = (dataSource, currentPostcode) => {
			for (let i = 0; i < dataSource._entityCollection._entities._array.length; i++) {
				const entity = dataSource._entityCollection._entities._array[i]
				if (entity._properties._posno._value === currentPostcode) {
					printEntity(entity)
				}
			}
		}

		const printEntity = (entity, postno, view) => {
			const container = document.getElementById('printContainer')

			// Clear existing content safely
			container.textContent = ''

			// Create heading
			const heading = document.createElement('u')
			heading.textContent = 'Found following properties & values:'
			container.appendChild(heading)
			container.appendChild(document.createElement('br'))

			// Add vtj_prt if applicable
			const idLength = String(entity._id).length
			if (idLength === 10) {
				const vtjLine = document.createElement('div')
				vtjLine.textContent = `vtj_prt: ${entity._id}`
				container.appendChild(vtjLine)
			}

			// Add entity properties
			const length = entity._properties._propertyNames.length
			for (let i = 0; i < length; ++i) {
				if (goodForPrint(entity._properties, i)) {
					const value = entity._properties[entity._properties._propertyNames[i]]._value

					// Check if the value is an object (like heat_timeseries)
					if (typeof value === 'object') {
						// If it's an object, skip it or handle it differently
						continue // This will skip printing the object
					}

					const propertyLine = document.createElement('div')
					propertyLine.textContent = `${entity._properties._propertyNames[i]}: ${
						typeof value === 'number' ? value.toFixed(2) : value
					}`
					container.appendChild(propertyLine)
				}
			}

			addFooterNote(postno, view)
		}

		const goodForPrint = (properties, i) => {
			const name = properties.propertyNames[i]
			return (
				!name.includes('fid') &&
				!name.includes('_id') &&
				!name.includes('value') &&
				name !== 'id' &&
				!name.includes('_x') &&
				!name.includes('_y') &&
				properties[name]._value &&
				!name.endsWith('id') &&
				!name.includes('gml_parent_property')
			)
		}

		const addFooterNote = (_postno, _view) => {
			const container = document.getElementById('printContainer')

			if (store.heatDataDate === '2023-06-23') {
				container.appendChild(document.createElement('br'))
				container.appendChild(document.createElement('br'))
				const note = document.createElement('i')
				note.textContent =
					'If average urban heat exposure of building is over 0.5, the areas with under 0.4 heat exposure are shown on map.'
				container.appendChild(note)
			}

			container.scroll({
				top: 1000,
				behavior: 'smooth',
			})
		}

		onMounted(() => {
			entityPrint()
			eventBus.on('entityPrintEvent', entityPrint)
			eventBus.on('geocodingPrintEvent', geocodingPrint)
		})

		// Unsubscribe from events before unmount
		onBeforeUnmount(() => {
			eventBus.off('entityPrintEvent', entityPrint)
			eventBus.off('geocodingPrintEvent', geocodingPrint)
		})

		return {
			entityPrint,
			geocodingPrint,
		}
	},
}
</script>

<style scoped>
#printContainer {
	width: 500px;
	position: relative;

	font-size: x-small;
	font-family: Monospace;
	text-align: left;
	padding: 10px;
	overflow-y: scroll;
}
</style>
