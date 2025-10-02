import * as Cesium from 'cesium';
import Datasource from './datasource.js';
import Urbanheat from './urbanheat.js';
import Tree from './tree.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { eventBus } from './eventEmitter.js';

/**
 * Building Service
 * Manages building entity visualization, heat exposure data, and user interactions.
 * Handles building filtering, highlighting, color coding by heat exposure,
 * and integration with tree coverage and urban heat data.
 *
 * Key responsibilities:
 * - Building entity polygon styling based on heat exposure
 * - Building height extrusion from floor count or measured height
 * - Building filtering (by purpose, construction date, floor count)
 * - Building selection and highlighting with outline effects
 * - Heat exposure data visualization and histogram updates
 * - Integration with tree coverage effects
 *
 * @class Building
 */
export default class Building {
	/**
	 * Creates a Building service instance
	 * Initializes service dependencies for data sources, urban heat, and tree coverage.
	 */
	constructor() {
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.propsStore = usePropsStore();
		this.viewer = this.store.cesiumViewer;
		this.datasourceService = new Datasource();
		this.treeService = new Tree();
		this.urbanheatService = new Urbanheat();
	}


	/**
	 * Removes nearby tree coverage effects from building entities
	 * Resets building polygon colors to original heat exposure values.
	 * Processes entities in batches to prevent UI blocking on large datasets.
	 * Performance: O(n) where n is the number of entities, with UI-friendly batching
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @returns {Promise<void>}
	 */
	async removeNearbyTreeEffect( entities ) {
		const batchSize = 25; // Process 25 entities at a time

		for ( let i = 0; i < entities.length; i += batchSize ) {
			const batch = entities.slice(i, i + batchSize);

			// Process batch synchronously
			for ( let j = 0; j < batch.length; j++ ) {
				this.setBuildingEntityPolygon( batch[j] );
			}

			// Yield control to browser to prevent UI blocking
			if ( i + batchSize < entities.length ) {
				await new Promise(resolve => requestIdleCallback(resolve));
			}
		}
	}

	/**
	 * Applies heat exposure visualization to building entities
	 * Updates building polygon colors based on heat exposure data.
	 * Uses batched processing for performance optimization.
	 * Performance: O(n) where n is the number of entities, with batching for UI responsiveness
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to style
	 * @returns {Promise<void>}
	 */
	async setHeatExposureToBuildings( entities ) {
		const batchSize = 25; // Process 25 entities at a time

		for ( let i = 0; i < entities.length; i += batchSize ) {
			const batch = entities.slice(i, i + batchSize);

			// Process batch synchronously
			for ( let j = 0; j < batch.length; j++ ) {
				this.setBuildingEntityPolygon( batch[j] );
			}

			// Yield control to browser to maintain responsiveness
			if ( i + batchSize < entities.length ) {
				await new Promise(resolve => requestIdleCallback(resolve));
			}
		}
	}


	/**
	 * Creates and emits events for building-specific data visualizations
	 * Processes building heat timeseries data, tree coverage, and heat exposure values.
	 * Emits events to trigger chart updates in UI components.
	 *
	 * @param {number} treeArea - Nearby tree coverage area in square meters
	 * @param {number} avg_temp_c - Average surface temperature in Celsius (unused in current implementation)
	 * @param {Object} buildingProps - Building properties object containing heat and structural data
	 * @param {Object} buildingProps.heat_timeseries - Time series heat exposure data
	 * @param {Object} buildingProps._avgheatexposuretobuilding - Average heat exposure value
	 * @returns {Promise<void>}
	 * @fires eventBus#newBuildingHeat - Emitted when building heat exposure data is updated
	 */
	async createBuildingCharts( treeArea, avg_temp_c, buildingProps ) {

		this.store.view === 'grid' && this.propsStore.setGridBuildingProps( buildingProps );

		// Process heat timeseries asynchronously to avoid blocking UI
		await new Promise(resolve => {
			filterHeatTimeseries( buildingProps );
			requestIdleCallback ? requestIdleCallback(resolve) : setTimeout(resolve, 0);
		});

		// Set tree area if tree layer is visible and data exists
		( this.toggleStore.showTrees && treeArea ) &&
      ( this.propsStore.setTreeArea( treeArea ) );

		// Set heat exposure data based on view mode (Helsinki vs Capital Region)
		this.toggleStore.helsinkiView
    		? ( this.propsStore.setBuildingHeatExposure( buildingProps._avgheatexposuretobuilding._value ), eventBus.emit( 'newBuildingHeat' ) )
    		: ( !this.toggleStore.helsinkiView
        		? ( buildingProps.heat_timeseries && this.propsStore.setBuildingHeatTimeseries( buildingProps.heat_timeseries._value ) )
        		: ( this.propsStore.setGridBuildingProps( buildingProps ) ) );
	}

	/**
 * Set building entity polygon
 *
 * @param {Object} entity - Building entity
 */
	setBuildingEntityPolygon( entity ) {
		const { properties, polygon } = entity;

		const targetDate = this.store.heatDataDate;

		if ( polygon ) {
							if (this.toggleStore.helsinkiView) {
								if ( properties?.avgheatexposuretobuilding ) {
				const heatExposureValue = properties.avgheatexposuretobuilding._value;
				polygon.material = new Cesium.Color( 1, 1 - heatExposureValue, 0, heatExposureValue );
								}

				} else {
      	const heatTimeseries = properties.heat_timeseries?._value || [];
      	const foundEntry = heatTimeseries.find( ( { date } ) => date === targetDate );
			
  if (foundEntry) { // Only set color if an entry is found
    if (targetDate === '2021-02-18') {
      polygon.material = new Cesium.Color(0, (1 - (1 - foundEntry.avgheatexposure)), 1, 1 - foundEntry.avgheatexposure);
    } else {
      polygon.material = new Cesium.Color(1, 1 - foundEntry.avgheatexposure, 0, foundEntry.avgheatexposure);
    }
  } else {
	entity.show = false;
    polygon.material = new Cesium.Color(0, 0, 0, 0); // Set color to 0 0 0 0 if no entry is found
  }
	}
}

		this.toggleStore.helsinkiView && ( this.hideNonSoteBuilding( entity ), this.hideLowBuilding( entity ) );
		( this.store.view === 'grid' && entity._properties?._kayttarks?._value !== 'Asuinrakennus' ) && ( entity.show = false );

	}

	/**
 * If hideNonSote switch is checked this function hides buildings based on value of c_kayttark
 *
 * @param {Object} entity - Cesium entity
 */
	hideNonSoteBuilding( entity ) {

		if ( this.toggleStore.hideNonSote ) {
			const kayttotark = entity._properties.c_kayttark?._value;

			if ( !kayttotark || ![ 511, 131 ].includes( Number( kayttotark ) ) && !( Number( kayttotark ) > 212 && Number( kayttotark ) < 240 ) ) {
				entity.show = false;
			}
		}
	}

	/**
 * If hideLow switch is checked this function hides buildings based on their floor count
 *
 * @param {Object} entity - Cesium entity
 */
	hideLowBuilding( entity ) {

		this.toggleStore.hideLow &&
      ( !Number( entity._properties.i_kerrlkm?._value ) || Number( entity._properties.i_kerrlkm?._value ) < 7 ) &&
      ( entity.show = false );

	}

	async setHelsinkiBuildingsHeight( entities ) {
		const batchSize = 30; // Process 30 entities at a time (height calc is lighter)
		
		for ( let i = 0; i < entities.length; i += batchSize ) {
			const batch = entities.slice(i, i + batchSize);
			
			// Process batch synchronously
			for ( let j = 0; j < batch.length; j++ ) {
				const entity = batch[j];
				
				if ( entity.polygon ) {
					const { measured_height, i_kerrlkm } = entity.properties;

					entity.polygon.extrudedHeight = measured_height
						? measured_height._value
						: ( i_kerrlkm != null
							? i_kerrlkm._value * 3.2
							: 2.7 );
				}
			}
			
			// Yield control to prevent UI blocking
			if ( i + batchSize < entities.length ) {
				await new Promise(resolve => requestIdleCallback(resolve));
			}
		}
	}

	async loadBuildings() {
		const url = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&CQL_FILTER=postinumero%3D%27' + this.store.postalcode + '%27';

		console.log('[HelsinkiBuilding] 🏢 Loading Helsinki buildings for postal code:', this.store.postalcode);
		console.log('[HelsinkiBuilding] API URL:', url);

		try {
			const response = await fetch( url );
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log('[HelsinkiBuilding] ✅ Received', data.features?.length || 0, 'building features');

			const entities = await this.urbanheatService.findUrbanHeatData( data );
			await this.setHeatExposureToBuildings( entities );
			await this.setHelsinkiBuildingsHeight( entities );
			
			console.log('[HelsinkiBuilding] ✅ Buildings processed and added to Cesium viewer');
		} catch ( error ) {
			console.error( '[HelsinkiBuilding] ❌ Error loading buildings:', error );
		}

		this.toggleStore.showTrees && this.treeService.loadTrees();
	}

	/**
 * Finds building datasource and resets building entities polygon
 *
 */
	resetBuildingEntities() {

		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) return;

		for ( let i = 0; i < buildingDataSource._entityCollection._entities._array.length; i++ ) {

			let entity = buildingDataSource._entityCollection._entities._array[i];


			entity.polygon.outlineColor = Cesium.Color.BLACK;
			entity.polygon.outlineWidth = 3;

			if ( entity.polygon ) {
				const color = entity._properties._avgheatexposuretobuilding
					? new Cesium.Color( 1, 1 - entity._properties._avgheatexposuretobuilding._value, 0, entity._properties._avgheatexposuretobuilding._value )
					: new Cesium.Color( 0, 0, 0, 0 );

				entity.polygon.material = color;
			}

		}

	}

	/**
 * Filter buildings from the given data source based on UI toggle switches.
 * 
 */
	filterBuildings( buildingsDataSource ) {

		// If the data source isn't found, exit the function
		if ( !buildingsDataSource ) return;

		const hideNewBuildings = this.toggleStore.hideNewBuildings;
		const hideNonSote = this.toggleStore.hideNonSote;
		const hideLow = this.toggleStore.hideLow;

		buildingsDataSource.entities.values.forEach( ( entity ) => {

			hideNewBuildings &&
        entity._properties?._c_valmpvm?._value &&
        new Date( entity._properties._c_valmpvm._value ).getTime() >= new Date( '2018-06-01T00:00:00' ).getTime() &&
        ( entity.show = false );

			hideNonSote && this.soteBuildings( entity );
			hideLow && this.lowBuildings( entity );

		} );

		this.updateHeatHistogramDataAfterFilter( buildingsDataSource.entities._entities._array );

	}

	/**
	 * Updates heat histogram data after filtering buildings
	 * Extracts heat exposure values from visible entities and emits update event.
	 *
	 * @param {Array<Cesium.Entity>} entities - Building entities to process
	 * @fires eventBus#newHeatHistogram - Emitted when histogram data is recalculated
	 * @private
	 */
	updateHeatHistogramDataAfterFilter( entities ) {

  		// Add the condition to filter only entities with show === true
  		const visibleEntities = entities.filter(entity => entity.show);
  		const targetDate = this.store.heatDataDate;

  		const avg_temp = this.toggleStore.helsinkiView
    		? visibleEntities.map(entity => entity.properties._avgheatexposuretobuilding._value)
    		: visibleEntities.map(entity => {
        		const heatTimeseries = entity.properties.heat_timeseries?._value || [];
        		const foundEntry = heatTimeseries.find(({ date }) => date === targetDate);
        		return foundEntry ? foundEntry.avg_temp_c : null;
      		}).filter(temp => temp !== null);

		this.resetBuildingOutline();
  		this.propsStore.setHeatHistogramData(avg_temp);
  		eventBus.emit('newHeatHistogram');

	}

	/**
	 * Filters buildings to show only social/healthcare facilities
	 * Filters by building purpose codes for hospitals, schools, and public buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 * @private
	 */
	soteBuildings( entity ) {

		const kayttotark = this.toggleStore.helsinkiView
			? entity._properties?._c_kayttark?._value ? Number( entity._properties.c_kayttark._value ) : null
			: entity._properties?._kayttarks?._value;

		entity.show = this.toggleStore.helsinkiView
			? kayttotark && ( [ 511, 131 ].includes( kayttotark ) || ( kayttotark > 210 && kayttotark < 240 ) )
			: kayttotark === 'Yleinen rakennus';

	}

	/**
	 * Hides buildings with 6 or fewer floors
	 * Used to filter out low-rise buildings from visualization.
	 *
	 * @param {Cesium.Entity} entity - Building entity to filter
	 * @private
	 */
	lowBuildings( entity ) {

		( entity._properties?.[this.toggleStore.helsinkiView ? '_i_kerrlkm' : '_kerrosten_lkm']?._value <= 6 ) && ( entity.show = false );

	}
	/**
* Shows all buildings and updates the histograms and scatter plot
*
*/
	showAllBuildings( buildingsDataSource ) {
		// If the data source isn't found, exit the function
		if ( !buildingsDataSource ) return;

		// Iterate over all entities in data source
		for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {

			// Show the entity
			buildingsDataSource._entityCollection._entities._array[i].show = true;

		}

		this.updateHeatHistogramDataAfterFilter( buildingsDataSource.entities._entities._array );

	}

	highlightBuildingsInViewer( temps ) {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) return;

		const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			!this.toggleStore.helsinkiView
				? this.outlineByTemperature( entity, 'avg_temp_c', temps )
				: this.outlineByTemperature( entity, 'avgheatexposuretobuilding', temps );

		}
	}

	resetBuildingOutline() {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) return;

		const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];
			this.polygonOutlineToBlack( entity );
		}
	}

	outlineByTemperature( entity, property, values ) {
		const heatTimeseries = entity._properties[ 'heat_timeseries' ]?._value || [];
		const foundEntry = heatTimeseries.find( ( { date } ) => date === this.store.heatDataDate );

		const shouldOutlineYellow = !this.toggleStore.helsinkiView 
			? foundEntry && values.includes( foundEntry.avg_temp_c )
			: entity._properties[property] && values.includes( entity._properties[ property ]._value );

		shouldOutlineYellow 
			? this.polygonOutlineToYellow( entity ) 
			: this.polygonOutlineToBlack( entity );
	}

	highlightBuildingInViewer( id ) {
		// Find the data source for buildings
		const buildingDataSource = this.datasourceService.getDataSourceByName( 'Buildings ' + this.store.postalcode );

		// If the data source isn't found, exit the function
		if ( !buildingDataSource ) return;

		const entities = buildingDataSource.entities.values;

		for ( let i = 0; i < entities.length; i++ ) {
			const entity = entities[i];

			this.outlineById( entity, this.toggleStore.helsinkiView ? 'id' : 'kiitun', id );

		}
	}

	/**
	 * Outlines a building entity by matching a property value
	 * Highlights matching entity with yellow outline and emits print event.
	 *
	 * @param {Cesium.Entity} entity - Building entity to check
	 * @param {string} property - Property name to match
	 * @param {string|number} id - Value to match against property
	 * @fires eventBus#entityPrintEvent - Emitted when entity is selected for display
	 * @private
	 */
	outlineById( entity, property, id ) {

		entity._properties[property] && entity._properties[property]._value === id
			? ( this.polygonOutlineToYellow( entity ), this.store.setPickedEntity( entity ), eventBus.emit( 'entityPrintEvent' ) )
			: this.polygonOutlineToBlack( entity );

	}

	/**
	 * Sets building polygon outline to yellow highlight
	 * Used to visually highlight selected buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to highlight
	 * @private
	 */
	polygonOutlineToYellow( entity ) {

		entity.polygon.outline = true;
		entity.polygon.outlineColor = Cesium.Color.YELLOW;
		entity.polygon.outlineWidth = 20;

	}

	/**
	 * Resets building polygon outline to default black
	 * Removes visual highlighting from buildings.
	 *
	 * @param {Cesium.Entity} entity - Building entity to reset
	 * @private
	 */
	polygonOutlineToBlack( entity ) {

		entity.polygon.outlineColor = Cesium.Color.BLACK;
		entity.polygon.outlineWidth = 8;

	}
}

/**
 * Filters heat timeseries data by construction year cutoff
 * Removes historical data predating the building's construction year.
 *
 * @param {Object} buildingProps - Building properties object
 * @param {Object} buildingProps._kavu - Construction year property
 * @param {Object} buildingProps._heat_timeseries - Heat timeseries array
 * @private
 */
const filterHeatTimeseries = ( buildingProps ) => {
	if ( buildingProps._kavu && typeof buildingProps._kavu._value === 'number' ) {
		const cutoffYear = buildingProps._kavu._value;
		buildingProps._heat_timeseries._value = buildingProps._heat_timeseries._value.filter( entry => {
			const entryYear = new Date( entry.date ).getFullYear();
			return entryYear >= cutoffYear;
		} );
	}
};
