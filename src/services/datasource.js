import * as Cesium from "cesium";
import { useGlobalStore } from "../stores/globalStore.js";

/**
 * DataSource Service
 * Manages Cesium data sources including GeoJSON loading, visibility, and lifecycle operations.
 * Provides utilities for adding, removing, and manipulating data sources in the CesiumJS viewer.
 *
 * @class DataSource
 */
export default class DataSource {
  /**
   * Creates a DataSource service instance
   */
  constructor() {
    this.store = useGlobalStore();
  }

  /**
   * Shows all data sources in the Cesium viewer
   * Iterates through all data sources and sets their visibility to true.
   *
   * @returns {void}
   */
  showAllDataSources() {
    this.store.cesiumViewer.dataSources._dataSources.forEach((dataSource) => {
      dataSource.show = true;
    });
  }

  /**
   * Changes the visibility of data sources matching a name prefix
   * Searches for data sources whose names start with the given prefix and updates their visibility.
   *
   * @param {string} name - Name prefix to match data sources against
   * @param {boolean} show - Visibility state to set (true to show, false to hide)
   * @returns {Promise<void>}
   */
  async changeDataSourceShowByName(name, show) {
    this.store.cesiumViewer.dataSources._dataSources.forEach((dataSource) => {
      if (dataSource.name.startsWith(name)) {
        dataSource.show = show;
      }
    });
  }

  /**
   * Removes all data sources and entities from the Cesium viewer
   * Clears both managed data sources and standalone entities.
   * Useful for complete scene reset operations.
   *
   * @returns {Promise<void>}
   */
  async removeDataSourcesAndEntities() {
    await this.store.cesiumViewer.dataSources.removeAll();
    // Remove all entities directly added to the viewer
    await this.store.cesiumViewer.entities.removeAll();
  }

  /**
   * Retrieves a data source by exact name match
   *
   * @param {string} name - Exact name of the data source to find
   * @returns {Cesium.DataSource|undefined} The matching data source, or undefined if not found
   */
  getDataSourceByName(name) {
    return this.store.cesiumViewer.dataSources._dataSources.find(
      (ds) => ds.name === name,
    );
  }

  /**
   * Removes all data sources whose names start with the specified prefix
   * Uses event listeners to ensure each removal completes before continuing.
   * Particularly useful for cleaning up layer-specific data sources.
   *
   * @param {string} namePrefix - Prefix to match against data source names
   * @returns {Promise<void>} Resolves when all matching data sources are removed
   */
  async removeDataSourcesByNamePrefix(namePrefix) {
    return new Promise((resolve, reject) => {
      const dataSources = this.store.cesiumViewer.dataSources._dataSources;
      const removalPromises = [];

      for (const dataSource of dataSources) {
        if (dataSource.name.startsWith(namePrefix)) {
          const removalPromise = new Promise((resolveRemove) => {
            // Use arrow function to preserve 'this' context
            const onDataSourceRemoved = () => {
              this.store.cesiumViewer.dataSources.dataSourceRemoved.removeEventListener(
                onDataSourceRemoved,
              );
              resolveRemove();
            };

            this.store.cesiumViewer.dataSources.remove(dataSource, true);
            this.store.cesiumViewer.dataSources.dataSourceRemoved.addEventListener(
              onDataSourceRemoved,
            );
          });

          removalPromises.push(removalPromise);
        }
      }

      // Wait for all removal promises to resolve
      Promise.all(removalPromises)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Loads GeoJSON data from URL and adds it to the Cesium viewer as a data source
   * Applies default styling including stroke, fill, and opacity settings.
   *
   * @param {number} opacity - Fill opacity for polygons (0-1)
   * @param {string} url - URL to fetch GeoJSON data from
   * @param {string} name - Name to assign to the created data source
   * @returns {Promise<Array<Cesium.Entity>>} Promise resolving to array of created entities
   * @throws {Error} If GeoJSON loading fails
   */
  async loadGeoJsonDataSource(opacity, url, name) {
    return new Promise((resolve, reject) => {
      Cesium.GeoJsonDataSource.load(url, {
        stroke: Cesium.Color.BLACK,
        fill: new Cesium.Color(0.3, 0.3, 0.3, opacity),
        strokeWidth: 8,
        clampToGround: false,
      })
        .then((dataSource) => {
          dataSource.name = name;
          this.store.cesiumViewer.dataSources.add(dataSource);
          const entities = dataSource.entities.values;
          resolve(entities);
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });
  }

  /**
   * Adds a GeoJSON data source with polygon geodesic arc type correction
   * Removes any existing data source with the same name before adding.
   * Fixes polygon rendering issues by setting arc type to GEODESIC.
   *
   * @param {Object|string} data - GeoJSON data object or URL string
   * @param {string} name - Name for the data source
   * @returns {Promise<Array<Cesium.Entity>>} Promise resolving to array of entities
   */
  async addDataSourceWithPolygonFix(data, name) {
    return new Promise((resolve) => {
      Cesium.GeoJsonDataSource.load(data, {
        stroke: Cesium.Color.BLACK,
        fill: Cesium.Color.CRIMSON,
        strokeWidth: 3,
        clampToGround: true,
      })
        .then((data) => {
          // Remove previous datasource with same name to avoid duplicates
          this.removeDataSourcesByNamePrefix(name);
          data.name = name;

          // Fix polygon rendering by setting geodesic arc type
          for (let i = 0; i < data.entities.values.length; i++) {
            let entity = data.entities.values[i];

            if (Cesium.defined(entity.polygon)) {
              entity.polygon.arcType = Cesium.ArcType.GEODESIC;
            }
          }

          this.store.cesiumViewer.dataSources.add(data);
          resolve(data.entities.values);
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }

  /**
   * Calculates the sum of a numeric property across all entities in a data source
   * Iterates through entities and sums the specified property values.
   *
   * @param {string} datasource - Name of the data source to analyze
   * @param {string} property - Property name to sum
   * @returns {number} Total sum of the property values, or 0 if data source not found
   */
  calculateDataSourcePropertyTotal(datasource, property) {
    // Find the data source
    const foundDataSource = this.getDataSourceByName(datasource);
    let total = 0;

    // If the data source isn't found, exit the function
    if (!foundDataSource) {
      return total;
    }

    // Iterate through the entities in the data source
    const entities = foundDataSource.entities.values;
    for (const entity of entities) {
      // Check if the entity has the specified property
      if (entity.properties && entity.properties.includes(property)) {
        // Extract the property value and add it to the total
        const propertyValue = entity.properties[property].getValue();
        if (!isNaN(propertyValue)) {
          total += propertyValue;
        }
      }
    }
    return total;
  }

  /**
   * Removes duplicate data sources from the Cesium viewer
   * Keeps only the first occurrence of each uniquely named data source.
   * Useful for cleaning up after multiple data loads or state changes.
   *
   * @returns {Promise<void>} Promise that resolves when operation completes
   */
  async removeDuplicateDataSources() {
    return new Promise((resolve, reject) => {
      const dataSources = this.store.cesiumViewer.dataSources._dataSources;
      const uniqueDataSources = {};

      // Track first occurrence of each uniquely named data source
      for (let i = 0; i < dataSources.length; i++) {
        const dataSource = dataSources[i];

        if (
          !uniqueDataSources[dataSource.name] ||
          uniqueDataSources[dataSource.name].index > i
        ) {
          // Store or replace if this is first occurrence or has smaller index
          uniqueDataSources[dataSource.name] = {
            dataSource: dataSource,
            index: i,
          };
        }
      }

      // Clear all existing data sources
      this.store.cesiumViewer.dataSources.removeAll();

      // Re-add only unique data sources
      const addPromises = [];
      for (const name in uniqueDataSources) {
        const dataSource = uniqueDataSources[name].dataSource;
        const addPromise = this.store.cesiumViewer.dataSources.add(dataSource);
        addPromises.push(addPromise);
      }

      // Wait for all data sources to be re-added
      Promise.all(addPromises)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Removes a specific data source by its exact name
   * If the data source is found, it is completely removed from the viewer.
   *
   * @param {string} name - Exact name of the data source to remove
   * @returns {Promise<void>}
   */
  async removeDataSourceByName(name) {
    // Find the data source named 'MajorDistricts' in the viewer
    const majorDistrictsDataSource = this.getDataSourceByName(name);

    // If the data source is found, remove it
    if (majorDistrictsDataSource) {
      this.store.cesiumViewer.dataSources.remove(
        majorDistrictsDataSource,
        true,
      );
    }
  }
}
