import * as Cesium from "cesium";
import Datasource from "./datasource.js";
import Building from "./building.js";
import Plot from "./plot.js";
import Traveltime from "./traveltime.js";
import HSYBuilding from "./hsybuilding.js";
import { findAddressForBuilding } from "./address.js";
import ElementsDisplay from "./elementsDisplay.js";
import { useGlobalStore } from "../stores/globalStore.js";
import { useToggleStore } from "../stores/toggleStore.js";
import { usePropsStore } from "../stores/propsStore.js";
import Helsinki from "./helsinki.js";
import CapitalRegion from "./capitalRegion.js";
import Sensor from "./sensor.js";
import Camera from "./camera.js";
import ColdArea from "./coldarea.js";
import { eventBus } from "../services/eventEmitter.js";

/**
 * FeaturePicker Service
 * Handles user interactions with map entities including click events, entity selection,
 * and navigation between geographic levels (region → postal code → building).
 * Coordinates data loading and view updates across multiple service dependencies.
 *
 * Manages three primary interaction levels:
 * - Start: Capital region overview
 * - PostalCode: Zoom into specific postal code area
 * - Building: Individual building details
 *
 * @class FeaturePicker
 */
export default class FeaturePicker {
  /**
   * Creates a FeaturePicker service instance
   * Initializes all required service dependencies for entity interaction handling.
   */
  constructor() {
    this.store = useGlobalStore();
    this.toggleStore = useToggleStore();
    this.propStore = usePropsStore();
    this.viewer = this.store.cesiumViewer;
    this.datasourceService = new Datasource();
    this.buildingService = new Building();
    this.helsinkiService = new Helsinki();
    this.capitalRegionService = new CapitalRegion();
    this.sensorService = new Sensor();
    this.plotService = new Plot();
    this.traveltimeService = new Traveltime();
    this.hSYBuildingService = new HSYBuilding();
    this.elementsDisplayService = new ElementsDisplay();
    this.cameraService = new Camera();
    this.coldAreaService = new ColdArea();
  }

  /**
   * Processes mouse click events on the Cesium viewer
   * Entry point for all entity selection interactions.
   * Converts screen coordinates to Cartesian2 and delegates to pickEntity.
   *
   * @param {MouseEvent} event - Browser mouse click event with x,y coordinates
   * @returns {void}
   */
  processClick(event) {
    console.log(
      "[FeaturePicker] 🖱️ Processing click at coordinates:",
      event.x,
      event.y,
    );
    this.pickEntity(new Cesium.Cartesian2(event.x, event.y));
  }

  /**
   * Picks and processes the entity at specified screen position
   * Uses Cesium scene.pick() to identify clicked entity and routes to appropriate handler.
   * Handles both direct entities and primitives with associated entity IDs.
   *
   * @param {Cesium.Cartesian2} windowPosition - Screen coordinates for entity picking
   * @returns {void}
   * @fires eventBus#entityPrintEvent - Emitted when a polygon entity is selected
   */
  pickEntity(windowPosition) {
    console.log(
      "[FeaturePicker] 🎯 Picking entity at window position:",
      windowPosition,
    );
    let picked = this.viewer.scene.pick(windowPosition);
    console.log("[FeaturePicker] Picked object:", picked);

    if (picked) {
      let id = Cesium.defaultValue(picked.id, picked.primitive?.id);

      if (picked.id._polygon) {
        if (id instanceof Cesium.Entity) {
          this.store.setPickedEntity(id);
          eventBus.emit("entityPrintEvent");
        }

        if (picked.id.properties) {
          this.handleFeatureWithProperties(picked.id);
        }
      }
    }
  }

  /**
   * Loads data and visualizations for the currently selected postal code
   * Clears existing data sources and loads region-specific elements based on Helsinki view mode.
   * Updates application level state and UI element visibility.
   *
   * @returns {Promise<void>}
   */
  async loadPostalCode() {
    console.log(
      "[FeaturePicker] 🚀 Loading postal code:",
      this.store.postalcode,
    );
    console.log(
      "[FeaturePicker] Helsinki view mode:",
      this.toggleStore.helsinkiView,
    );

    this.setNameOfZone();
    this.elementsDisplayService.setSwitchViewElementsDisplay("inline-block");
    this.datasourceService.removeDataSourcesAndEntities();

    // Load region-specific data based on view mode
    if (!this.toggleStore.helsinkiView) {
      console.log(
        "[FeaturePicker] Loading Capital Region elements (including buildings)...",
      );
      await this.capitalRegionService.loadCapitalRegionElements();
    } else {
      console.log(
        "[FeaturePicker] Loading Helsinki elements (including buildings)...",
      );
      this.helsinkiService.loadHelsinkiElements();
    }

    this.store.setLevel("postalCode");
    console.log("[FeaturePicker] ✅ Postal code loading complete");
  }

  /**
   * Sets the name of the current zone from postal code data
   * Searches through postal code entities to find matching postal code and extracts zone name.
   *
   * @returns {void}
   * @private
   */
  setNameOfZone() {
    const entitiesArray =
      this.propStore.postalCodeData._entityCollection?._entities._array;

    if (Array.isArray(entitiesArray)) {
      for (let i = 0; i < entitiesArray.length; i++) {
        const entity = entitiesArray[i];
        if (
          entity &&
          entity._properties &&
          entity._properties._nimi &&
          typeof entity._properties._nimi._value !== "undefined" &&
          entity._properties._posno._value === this.store.postalcode
        ) {
          this.store.setNameOfZone(entity._properties._nimi);
          break; // Exit the loop after finding the first match
        }
      }
    }
  }

  /**
   * Handles building feature selection and visualization
   * Updates application level to 'building', shows loading indicator, emits visibility events,
   * and creates building-specific charts. Manages loading state throughout the process.
   *
   * @param {Object} properties - Building properties object containing building attributes
   * @param {string} properties._postinumero - Postal code of the building
   * @param {number} [properties.treeArea] - Nearby tree area
   * @param {number} [properties._avg_temp_c] - Average temperature
   * @returns {Promise<void>}
   * @fires eventBus#hideHelsinki - Emitted when switching away from Helsinki view
   * @fires eventBus#hideCapitalRegion - Emitted when switching away from Capital Region view
   * @fires eventBus#showBuilding - Emitted when building level view is activated
   */
  async handleBuildingFeature(properties) {
    // Show loading indicator for building selection
    try {
      const { useLoadingStore } = await import("../stores/loadingStore.js");
      const loadingStore = useLoadingStore();
      loadingStore.startLoading(
        "building-selection",
        "Loading building information...",
      );
    } catch (error) {
      console.warn("Loading store not available:", error);
    }

    try {
      // Update application state to building level
      this.store.setLevel("building");
      this.store.setPostalCode(properties._postinumero._value);
      this.toggleStore.helsinkiView
        ? eventBus.emit("hideHelsinki")
        : eventBus.emit("hideCapitalRegion");
      eventBus.emit("showBuilding");
      this.elementsDisplayService.setBuildingDisplay("none");
      this.buildingService.resetBuildingOutline();

      // Process building charts asynchronously
      await this.buildingService.createBuildingCharts(
        properties.treeArea,
        properties._avg_temp_c,
        properties,
      );
    } catch (error) {
      console.error("Error handling building feature:", error);
    } finally {
      // Hide loading indicator
      try {
        const { useLoadingStore } = await import("../stores/loadingStore.js");
        const loadingStore = useLoadingStore();
        loadingStore.stopLoading("building-selection");
      } catch (error) {
        console.warn("Loading store not available for cleanup:", error);
      }
    }
  }

  /**
   * Removes entities from viewer by name
   * Iterates through all entities and removes those matching the specified name.
   *
   * @param {string} name - Name of entities to remove
   * @returns {void}
   */
  removeEntityByName(name) {
    this.viewer.entities._entities._array.forEach((entity) => {
      if (entity.name === name) {
        this.viewer.entities.remove(entity);
      }
    });
  }

  /**
   * Handles the feature with properties
   *
   * @param {Object} id - The ID of the picked entity
   * @fires eventBus#createHeatFloodVulnerabilityChart - Emitted when grid cell with vulnerability data is selected
   * @private
   */
  handleFeatureWithProperties(id) {
    console.log("[FeaturePicker] Clicked feature properties:", id.properties);
    console.log("[FeaturePicker] Current level:", this.store.level);

    this.removeEntityByName("coldpoint");
    this.removeEntityByName("currentLocation");
    this.datasourceService.removeDataSourcesByNamePrefix("TravelLabel");

    this.propStore.setTreeArea(null);
    this.propStore.setHeatFloodVulnerability(id.properties ?? null);

    if (id.properties.grid_id) {
      this.propStore.setHeatFloodVulnerability(id.properties);
      eventBus.emit("createHeatFloodVulnerabilityChart");
    }

    //See if we can find building floor areas
    if (this.store.level == "postalCode") {
      this.store.setBuildingAddress(findAddressForBuilding(id.properties));

      if (id.properties._locationUnder40) {
        if (id.properties._locationUnder40._value) {
          this.coldAreaService.addColdPoint(
            id.properties._locationUnder40._value,
          );
        }
      }

      this.handleBuildingFeature(id.properties);
    }

    //If we find postal code, we assume this is an area & zoom in AND load the buildings for it.
    if (id.properties.posno && this.store.level != "building") {
      const newPostalCode = id.properties.posno._value;
      const currentPostalCode = this.store.postalcode;

      console.log("[FeaturePicker] ✓ Postal code detected:", newPostalCode);
      console.log("[FeaturePicker] Current postal code:", currentPostalCode);

      // Allow switching between postal codes or loading a new one
      if (newPostalCode !== currentPostalCode || this.store.level === "start") {
        console.log("[FeaturePicker] Triggering postal code loading...");
        this.store.setPostalCode(newPostalCode);
        this.cameraService.switchTo3DView();
        this.elementsDisplayService.setViewDisplay("none");
        this.loadPostalCode();
      } else {
        console.log(
          "[FeaturePicker] ⚠️ Same postal code already selected, skipping reload",
        );
      }
    } else if (id.properties.posno) {
      console.log(
        "[FeaturePicker] ⚠️ Postal code found but current level is building, skipping load",
      );
    } else {
      console.log(
        "[FeaturePicker] ⚠️ No postal code property (posno) found in clicked feature",
      );
    }

    if (id.properties.asukkaita) {
      const boundingBox = this.getBoundingBox(id);
      this.store.setCurrentGridCell(id);

      // Construct the URL for the WFS request with the bounding box
      if (boundingBox) {
        const bboxString = `${boundingBox.minLon},${boundingBox.minLat},${boundingBox.maxLon},${boundingBox.maxLat}`;

        // Now you can use this URL to make your WFS request
        this.hSYBuildingService.loadHSYBuildings(bboxString);
      }

      //createDiagramForPopulationGrid( id.properties.index, id.properties.asukkaita );
    }

    if (
      !id.properties.posno &&
      id.entityCollection._entities._array[0]._properties._id &&
      id.entityCollection._entities._array[0]._properties._id._value == 5879932
    ) {
      this.traveltimeService.loadTravelTimeData(id.properties.id._value);
      this.traveltimeService.markCurrentLocation(id);
    }
  }

  /**
   * Calculates bounding box (geographic extent) for a polygon entity
   * Extracts polygon positions, converts to geographic coordinates, and finds min/max bounds.
   * Hides the entity after calculating its bounding box.
   *
   * @param {Cesium.Entity} id - Entity with polygon property
   * @returns {Object|null} Bounding box object with {minLon, maxLon, minLat, maxLat} in degrees, or null if no polygon
   */
  getBoundingBox(id) {
    let boundingBox = null;

    if (id.polygon) {
      // Access the polygon hierarchy to get vertex positions
      const hierarchy = id.polygon.hierarchy.getValue();

      if (hierarchy) {
        const positions = hierarchy.positions;

        // Convert Cartesian positions to geographic coordinates (latitude/longitude)
        const cartographics = positions.map((position) =>
          Cesium.Cartographic.fromCartesian(position),
        );

        // Find the geographic extent (bounding box)
        let minLon = Number.POSITIVE_INFINITY,
          maxLon = Number.NEGATIVE_INFINITY;
        let minLat = Number.POSITIVE_INFINITY,
          maxLat = Number.NEGATIVE_INFINITY;

        cartographics.forEach((cartographic) => {
          minLon = Math.min(minLon, cartographic.longitude);
          maxLon = Math.max(maxLon, cartographic.longitude);
          minLat = Math.min(minLat, cartographic.latitude);
          maxLat = Math.max(maxLat, cartographic.latitude);
        });

        // Convert radians to degrees
        minLon = Cesium.Math.toDegrees(minLon);
        maxLon = Cesium.Math.toDegrees(maxLon);
        minLat = Cesium.Math.toDegrees(minLat);
        maxLat = Cesium.Math.toDegrees(maxLat);

        boundingBox = {
          minLon: minLon,
          maxLon: maxLon,
          minLat: minLat,
          maxLat: maxLat,
        };

        // Hide entity after extracting bounds
        id.show = false;
      }
    }

    return boundingBox;
  }
}
