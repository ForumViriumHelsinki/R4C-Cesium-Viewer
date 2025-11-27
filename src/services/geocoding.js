import Camera from './camera.js';
import FeaturePicker from './featurepicker.js';
import View from './camera.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Landcover from './landcover.js';
import { eventBus } from './eventEmitter.js';

/**
 * Geocoding Service
 * Provides address search and geocoding functionality using Digitransit API.
 * Handles autocomplete search, address filtering, camera navigation to locations,
 * and postal code resolution. Integrates with Helsinki/Capital Region view modes.
 *
 * Features:
 * - Real-time address autocomplete (3+ characters)
 * - Geocoding via Digitransit geocoding API
 * - Camera movement to selected addresses
 * - Postal code extraction and zone name resolution
 * - Helsinki-specific filtering option
 *
 * **Lifecycle Management:**
 * - Created: When UnifiedSearch component mounts
 * - Destroyed: When UnifiedSearch component unmounts
 * - **Cleanup responsibility:** Parent component MUST call destroy() in beforeUnmount hook
 *
 * **Resources Managed:**
 * - 3 DOM event listeners (search input, search button, results list)
 * - DOM element references (searchField, searchButton, addressResult)
 *
 * @class Geocoding
 * @see {@link https://digitransit.fi/en/developers/apis/2-geocoding-api/|Digitransit Geocoding API}
 * @see {@link ../../docs/SERVICE_LIFECYCLE.md|Service Lifecycle Documentation}
 *
 * @example
 * // In component
 * import Geocoding from '@/services/geocoding.js';
 *
 * let geocodingService = null;
 *
 * onMounted(() => {
 *   geocodingService = new Geocoding();
 *   geocodingService.addGeocodingEventListeners();
 * });
 *
 * onBeforeUnmount(() => {
 *   if (geocodingService) {
 *     geocodingService.destroy();
 *     geocodingService = null;
 *   }
 * });
 */
export default class Geocoding {
	/**
	 * Creates a Geocoding service instance
	 */
	constructor() {
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer();
		this.cameraService = new Camera();
		this.featurePicker = new FeaturePicker();
		this.addressData = null;
		this.viewService = new View();
		this.toggleStore = useToggleStore();

		// Track DOM elements for cleanup
		this.searchField = null;
		this.searchButton = null;
		this.addressResult = null;
	}

	/**
	 * Adds event listeners for user interactions
	 */
	addGeocodingEventListeners() {
		this.searchField = document.getElementById('searchInput');
		this.searchButton = document.getElementById('searchButton');
		this.addressResult = document.getElementById('searchresults');

		if (this.searchButton) {
			this.searchButton.addEventListener('click', this.checkSearch);
		}
		if (this.searchField) {
			this.searchField.addEventListener('keyup', this.filterSearchResults);
		}
		if (this.addressResult) {
			this.addressResult.addEventListener('click', this.moveCameraToLocation);
		}
	}

	/**
	 * Removes event listeners to prevent memory leaks
	 */
	removeGeocodingEventListeners() {
		if (this.searchButton) {
			this.searchButton.removeEventListener('click', this.checkSearch);
		}
		if (this.searchField) {
			this.searchField.removeEventListener('keyup', this.filterSearchResults);
		}
		if (this.addressResult) {
			this.addressResult.removeEventListener('click', this.moveCameraToLocation);
		}
	}

	/**
	 * Cleanup method to prevent memory leaks
	 * MUST be called by parent component in beforeUnmount hook.
	 *
	 * Cleans up:
	 * - Removes all event listeners (search input, button, results)
	 * - Nullifies DOM element references
	 * - Clears cached address data
	 *
	 * @returns {void}
	 *
	 * @example
	 * onBeforeUnmount(() => {
	 *   geocodingService.destroy();
	 * });
	 */
	destroy() {
		this.removeGeocodingEventListeners();
		this.searchField = null;
		this.searchButton = null;
		this.addressResult = null;
		this.addressData = null;
	}

	/**
	 * Checks if there is only one value in searchresults and moves camera to the location
	 */
	checkSearch = () => {
		if (this.addressData.length === 1) {
			this.store.setPostalCode(this.addressData[0].postalcode);
			this.moveCameraAndReset(this.addressData[0].longitude, this.addressData[0].latitude);
			// Clear search results safely using textContent
			const searchResultsElement = document.getElementById('searchresults');
			searchResultsElement.textContent = '';
		}
	};

	/**
	 * Processes the data found with geocoding API. Only results from Helsinki are included and only data useful for app is left in
	 *
	 * @param {Object} data - Found data
	 * @returns {Object} Processed data
	 */
	processAddressData = (data) => {
		let features = [];

		for (let i = 0, len = data.length; i < len; i++) {
			let row = {
				address: data[i]['properties']['name'],
				latitude: data[i]['geometry']['coordinates'][1],
				longitude: data[i]['geometry']['coordinates'][0],
				postalcode: data[i].properties.postalcode,
			};

			if (this.toggleStore.helsinkiView) {
				// only include results from Helsinki
				if (
					(data[i]['properties']['locality'] === 'Helsinki' ||
						data[i]['properties']['localadmin'] === 'Helsinki') &&
					data[i].properties.postalcode
				) {
					features.push(row);
				}
			} else {
				features.push(row);
			}
		}

		return features;
	};

	/**
	 * Function that filters search results
	 */
	filterSearchResults = async () => {
		const searchresultscontainer = document.getElementById('searchresultscontainer');
		const searchField = document.getElementById('searchInput');
		searchresultscontainer.style.display = 'none';

		if (searchField.value.length > 2) {
			try {
				let response = await fetch(
					'/digitransit/geocoding/v1/autocomplete?text=' + searchField.value
				);
				let data = await response.json();

				// Use arrow functions to maintain the component's context
				this.addressData = this.processAddressData(data['features']);
				let streetAddresses = this.addressData.map((d) => d.address);
				this.renderSearchResult(streetAddresses);
			} catch (error) {
				console.error(error);
			}
		}
	};

	/**
	 * Finds coordinates for street address / search term and moves camera to the found coordinates
	 *
	 * @param {Object} e - Event object from UI
	 */
	moveCameraToLocation = (e) => {
		let lat;
		let long;
		let postcode;

		e = e || window.event;
		let target = e.target || e.srcElement;
		let text = target.textContent || target.innerText;

		for (let i = 0; i < this.addressData.length; i++) {
			if (this.addressData[i].address === text) {
				lat = this.addressData[i].latitude;
				long = this.addressData[i].longitude;
				this.store.setPostalCode(this.addressData[i].postalcode);
				break;
			}
		}

		this.findNameOfZone(postcode);
		this.moveCameraAndReset(long, lat);
		// Clear search results safely using textContent
		const searchResultsElement = document.getElementById('searchresults');
		searchResultsElement.textContent = '';
		document.getElementById('searchInput').value = 'enter place or address';
		const searchresultscontainer = document.getElementById('searchresultscontainer');
		searchresultscontainer.style.display = 'none';
	};

	/**
	 * Renders autocomplete search result
	 *
	 * @param {Array<string>} addresses - Addresses shown to user
	 */
	renderSearchResult(addresses) {
		const searchResultsElement = document.getElementById('searchresults');
		const searchresultscontainer = document.getElementById('searchresultscontainer');

		// Clear existing results safely
		searchResultsElement.textContent = '';

		// Create DOM elements for each address (prevents XSS)
		addresses.forEach((address) => {
			const dt = document.createElement('dt');
			dt.textContent = address; // Safe - no HTML parsing
			searchResultsElement.appendChild(dt);
		});

		searchresultscontainer.style.display = 'block';
		searchresultscontainer.style.visibility = addresses.length > 0 ? 'visible' : 'hidden';
	}

	/**
	 * Moves camera to specified latitude, longitude coordinates
	 * Centers the camera view and emits geocoding event, then loads postal code data.
	 *
	 * @param {number} longitude - Longitude coordinate
	 * @param {number} latitude - Latitude coordinate
	 * @fires eventBus#geocodingPrintEvent - Emitted when camera moves to geocoded location
	 * @private
	 */
	moveCameraAndReset(longitude, latitude) {
		this.cameraService.setCameraView(longitude, latitude);
		eventBus.emit('geocodingPrintEvent');
		this.featurePicker.loadPostalCode();

		if (this.toggleStore.switchView) {
			this.cameraService.switchTo2DView();
		}

		if (this.toggleStore.landCover) {
			const landcoverService = new Landcover();
			landcoverService.emitLandcoverEvent();
		}
	}

	/**
	 * Finds name of the new zone based on it's postal code
	 *
	 * @param {string} postalcode - Postal code of new zone
	 */
	findNameOfZone(postalcode) {
		// Find the data source for postcodes
		const postCodesDataSource = this.viewer.dataSources._dataSources.find(
			(ds) => ds.name === 'PostCodes'
		);

		if (!postCodesDataSource) {
			return;
		}

		// Iterate over all entities in the postcodes data source.
		for (let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++) {
			let entity = postCodesDataSource._entityCollection._entities._array[i];

			// Check if the entity posno property matches the postalcode.
			if (entity._properties._posno._value == postalcode) {
				this.store.setNameOfZone(entity._properties._nimi._value);
				break;
			}
		}
	}
}
