import Datasource from "./datasource.js";
import * as Cesium from "cesium";
import { useGlobalStore } from "../stores/globalStore.js";

/**
 * Sensor Service
 * Manages real-time environmental sensor data visualization from R4C monitoring network.
 * Loads GeoJSON sensor data and displays temperature, humidity, and timing information
 * as Cesium labels at sensor locations.
 *
 * Data source: bri3.fvh.io R4C open data endpoint (latest measurements)
 *
 * Visualizes:
 * - Air temperature (temp_air) in Celsius
 * - Relative humidity (rh_air) in percentage
 * - Measurement timestamp
 *
 * @class Sensor
 */
export default class Vegetation {
  /**
   * Creates a Sensor service instance
   */
  constructor() {
    this.store = useGlobalStore();
    this.viewer = this.store.cesiumViewer;
    this.datasourceService = new Datasource();
  }

  /**
   * Fetches latest sensor data
   *
   */
  async loadSensorData() {
    fetch("https://bri3.fvh.io/opendata/r4c/r4c_last.geojson")
      .then((response) => response.json())
      .then((data) => {
        // Create a Cesium data source
        let dataSource = new Cesium.GeoJsonDataSource();

        // Load the GeoJSON data into the data source
        dataSource.load(data, {
          markerColor: Cesium.Color.ORANGE, // Customize the marker color if desired
          clampToGround: true, // Set to true to clamp entities to the ground
        });

        this.addSensorDataSource(data);

        //	return response.json();
      })
      .catch((e) => {
        console.log("something went wrong", e);
      });
  }

  /**
   * Adds the data to viewer's datasources
   *
   * @param {Array<Object>} data - Sensor data array
   */
  async addSensorDataSource(data) {
    let entities = await this.datasourceService.addDataSourceWithPolygonFix(
      data,
      "SensorData",
    );

    // Iterate over the entities and add labels for "temp_air" and "rh_air"
    for (let i = 0; i < entities.length; i++) {
      let entity = entities[i];
      let measurement = entity.properties._measurement._value;

      if (measurement) {
        let tempAir = measurement.temp_air;
        let rhAir = measurement.rh_air;

        // Create a Date object from the timestamp
        let date = new Date(measurement.time);

        // Get the month, day, hour, and minute components
        let month = date.getMonth(); // Adding 1 since getMonth() returns a zero-based index
        let day = date.getDate();
        let hour = date.getHours();
        let minute = date.getMinutes();

        // Create a new Date object with the extracted components
        let formattedDate = new Date(0, month, day, hour, minute);
        // Format the components into a string
        let formattedString = formattedDate.toLocaleString("en-GB", {
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        });

        if (tempAir !== undefined && rhAir !== undefined) {
          entity.label = {
            text:
              "Temp: " +
              tempAir.toFixed(1) +
              "°C \nRH: " +
              rhAir.toFixed(1) +
              "% \nTime: " +
              formattedString,
            showBackground: true,
            font: "14px sans-serif",
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            pixelOffset: new Cesium.Cartesian2(8, -8),
            fillColor: Cesium.Color.BLUE,
            backgroundColor: Cesium.Color.YELLOW,
            eyeOffset: new Cesium.Cartesian3(0, 0, -100),
          };
        }
      }

      entity.billboard = undefined; // Remove any billboard icon
      entity.point = undefined; // Remove any point marker
      entity.polyline = undefined; // Remove any polyline
      entity.polygon = undefined; // Remove any polygon
    }
  }
}
