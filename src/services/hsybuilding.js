import Datasource from './datasource.js';
import Building from './building.js';
import UrbanHeat from './urbanheat.js';
import { eventBus } from './eventEmitter.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import * as turf from '@turf/turf';
import * as Cesium from 'cesium';
import { useToggleStore } from '../stores/toggleStore.js';
import { useBuildingStore } from '../stores/buildingStore.js';

export default class HSYBuilding {
    constructor() {
        this.store = useGlobalStore();
        this.viewer = this.store.cesiumViewer;
        this.datasourceService = new Datasource();
        this.buildingService = new Building();
        this.urbanHeatService = new UrbanHeat();
        this.toggleStore = useToggleStore();
    }

    async loadHSYBuildings() {
        try {
            const url = '/pygeoapi/collections/hsy_buildings/items?f=json&limit=5000&postinumero=' + this.store.postalcode;
            console.log('url', url);
            
            const response = await fetch(url);
            const data = await response.json();

            // Only process grid attributes if we have a current grid cell
            if (this.store.currentGridCell) {
                await this.setGridAttributes(data.features);
            }

            let entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'Buildings ' + this.store.postalcode);
            this.setHSYBuildingAttributes(data, entities);
            
            return entities;
        } catch (error) {
            console.error('Error loading HSY buildings:', error);
            throw error;
        }
    }

    createGeoJsonPolygon() {
        try {
            if (!this.store.currentGridCell?.polygon?.hierarchy) {
                console.warn('No valid grid cell polygon found');
                return null;
            }

            const cesiumPolygon = this.store.currentGridCell.polygon.hierarchy.getValue(Cesium.JulianDate.now());
            
            return {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates: [cesiumPolygon.positions.map(cartesian => {
                        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                        return [
                            Cesium.Math.toDegrees(cartographic.longitude),
                            Cesium.Math.toDegrees(cartographic.latitude)
                        ];
                    })]
                }
            };
        } catch (error) {
            console.error('Error creating GeoJSON polygon:', error);
            return null;
        }
    }

    setInitialAttributesForIntersectingBuilding(feature, weight, cellProps) {
        if (!cellProps?.asukkaita) return;

        const asukkaita = cellProps.asukkaita;
        feature.properties.pop_d_0_9 = weight * (cellProps.ika0_9 / asukkaita).toFixed(4);
        feature.properties.pop_d_10_19 = weight * (cellProps.ika10_19 / asukkaita).toFixed(4);
        feature.properties.pop_d_20_29 = weight * (cellProps.ika20_29 / asukkaita).toFixed(4);
        feature.properties.pop_d_30_39 = weight * (cellProps.ika30_39 / asukkaita).toFixed(4);
        feature.properties.pop_d_40_49 = weight * (cellProps.ika40_49 / asukkaita).toFixed(4);
        feature.properties.pop_d_50_59 = weight * (cellProps.ika50_59 / asukkaita).toFixed(4);
        feature.properties.pop_d_60_69 = weight * (cellProps.ika60_69 / asukkaita).toFixed(4);
        feature.properties.pop_d_70_79 = weight * (cellProps.ika70_79 / asukkaita).toFixed(4);
        feature.properties.pop_d_over80 = weight * (cellProps.ika_yli80 / asukkaita).toFixed(4);
    }

    approximateOtherAttributesForIntersectingBuilding(feature, weight, gridProps) {
        for (let i = 0; i < gridProps.length; i++) {
            const props = gridProps[i];
            if (!props?.asukkaita) continue;

            const asukkaita = props.asukkaita;
            feature.properties.pop_d_0_9 += weight * (props.ika0_9 / asukkaita).toFixed(4);
            feature.properties.pop_d_10_19 += weight * (props.ika10_19 / asukkaita).toFixed(4);
            feature.properties.pop_d_20_29 += weight * (props.ika20_29 / asukkaita).toFixed(4);
            feature.properties.pop_d_30_39 += weight * (props.ika30_39 / asukkaita).toFixed(4);
            feature.properties.pop_d_40_49 += weight * (props.ika40_49 / asukkaita).toFixed(4);
            feature.properties.pop_d_50_59 += weight * (props.ika50_59 / asukkaita).toFixed(4);
            feature.properties.pop_d_60_69 += weight * (props.ika60_69 / asukkaita).toFixed(4);
            feature.properties.pop_d_70_79 += weight * (props.ika70_79 / asukkaita).toFixed(4);
            feature.properties.pop_d_over80 += weight * (props.ika_yli80 / asukkaita).toFixed(4);
        }
    }

    approximateAttributesForIntersectingBuildings(feature) {
        try {
            const cellProps = this.store.currentGridCell.properties;
            if (!feature.geometry) return;

            const featureBBox = turf.bbox(feature);
            const bboxPolygon = turf.bboxPolygon(featureBBox);
            let gridProps = [];

            const populationGridDataSource = this.datasourceService.getDataSourceByName('PopulationGrid');
            if (!populationGridDataSource) return;

            const entities = populationGridDataSource.entities.values;

            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.properties._index._value !== cellProps._index._value) {
                    const entityGeoJson = this.entityToGeoJson(entity);
                    if (entityGeoJson && turf.booleanIntersects(bboxPolygon, entityGeoJson)) {
                        gridProps.push(entityGeoJson.properties);
                    }
                }
            }

            const weight = this.getWeight(gridProps.length);
            this.setInitialAttributesForIntersectingBuilding(feature, weight, cellProps);
            this.approximateOtherAttributesForIntersectingBuilding(feature, weight, gridProps);
        } catch (error) {
            console.error('Error approximating attributes:', error);
        }
    }

    setGridAttributesForWithinBuilding(feature) {
        const cellProps = this.store.currentGridCell.properties;
        if (!cellProps?.asukkaita) return;

        const asukkaita = cellProps.asukkaita;
        feature.properties.pop_d_0_9 = (cellProps.ika0_9 / asukkaita).toFixed(4);
        feature.properties.pop_d_10_19 = (cellProps.ika10_19 / asukkaita).toFixed(4);
        feature.properties.pop_d_20_29 = (cellProps.ika20_29 / asukkaita).toFixed(4);
        feature.properties.pop_d_30_39 = (cellProps.ika30_39 / asukkaita).toFixed(4);
        feature.properties.pop_d_40_49 = (cellProps.ika40_49 / asukkaita).toFixed(4);
        feature.properties.pop_d_50_59 = (cellProps.ika50_59 / asukkaita).toFixed(4);
        feature.properties.pop_d_60_69 = (cellProps.ika60_69 / asukkaita).toFixed(4);
        feature.properties.pop_d_70_79 = (cellProps.ika70_79 / asukkaita).toFixed(4);
        feature.properties.pop_d_over80 = (cellProps.ika_yli80 / asukkaita).toFixed(4);
    }

    async setGridAttributes(features) {
        const geoJsonPolygon = this.createGeoJsonPolygon();
        
        if (!geoJsonPolygon) {
            console.warn('Skipping grid attributes - no valid polygon');
            return;
        }

        for (let i = 0; i < features.length; i++) {
            try {
                let feature = features[i];
                if (!feature.geometry) continue;

                const featureGeoJson = {
                    type: 'Feature',
                    properties: feature.properties,
                    geometry: feature.geometry
                };

                const isWithin = turf.booleanWithin(featureGeoJson, geoJsonPolygon);

                if (isWithin) {
                    this.setGridAttributesForWithinBuilding(feature);
                } else {
                    this.approximateAttributesForIntersectingBuildings(feature);
                }
            } catch (error) {
                console.warn(`Error processing feature ${i}:`, error);
                continue;
            }
        }
    }

    getWeight(length) {
        const weights = {
            0: 1,
            1: 1/2,
            2: 1/3,
            3: 1/4
        };
        return weights[length] || 1;
    }

    entityToGeoJson(entity) {
        try {
            if (!entity?.polygon?.hierarchy) return null;

            const positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
            const coordinates = positions.map(position => {
                const cartographic = Cesium.Cartographic.fromCartesian(position);
                return [
                    Cesium.Math.toDegrees(cartographic.longitude),
                    Cesium.Math.toDegrees(cartographic.latitude)
                ];
            });

            if (coordinates.length > 0 && 
                (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
                 coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
                coordinates.push(coordinates[0]);
            }

            return {
                type: 'Feature',
                properties: entity.properties,
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                }
            };
        } catch (error) {
            console.error('Error converting entity to GeoJSON:', error);
            return null;
        }
    }

    setHSYBuildingsHeight(entities) {
        for (const entity of entities) {
            if (!entity.polygon) continue;

            const floorCount = entity.properties?.kerrosten_lkm?._value;
            entity.polygon.extrudedHeight = (floorCount != null && floorCount < 999) 
                ? floorCount * 3.2 
                : 2.7;
        }
    }

    async calculateHSYUrbanHeatData(data, entities) {
        const heatExposureData = this.urbanHeatService.calculateAverageExposure(data.features);
		const targetDate = this.store.heatDataDate;

        const avgTempCList = entities
            .map(entity => {
                // Get the actual array from ConstantProperty
                const heatTimeseries = entity.properties.heat_timeseries?.getValue() || []; 

                if (!Array.isArray(heatTimeseries)) return null;

                // Find the entry that matches the target date
                const foundEntry = heatTimeseries.find(({ date }) => date === targetDate);
                return foundEntry ? foundEntry.avg_temp_c : null;
            })
            .filter(temp => temp !== null); // Keep only valid temperature values

        setBuildingPropsAndEmitEvent(entities, heatExposureData, avgTempCList, data);
    }

    setHSYBuildingAttributes(data, entities) {
        this.buildingService.setHeatExposureToBuildings(entities);
        this.setHSYBuildingsHeight(entities);
        if (this.store.postalcode) {
            this.calculateHSYUrbanHeatData(data, entities);
        }
    }

    hideNonSoteBuilding(entity) {
        if (!this.toggleStore.hideNonSote) return;

        const kayttotark = entity._properties?.kayttarks?._value;
        if (!kayttotark || kayttotark !== 'Yleinen rakennus') {
            entity.show = false;
        }
    }

    hideLowBuilding(entity) {
        if (!this.toggleStore.hideLow) return;

        const floorCount = Number(entity._properties?.kerrosten_lkm?._value);
        if (!floorCount || floorCount < 7) {
            entity.show = false;
        }
    }
}

const setBuildingPropsAndEmitEvent = (entities, heatExposureData, avg_temp_cList, data) => {
    const propsStore = usePropsStore();
    propsStore.setScatterPlotEntities(entities);
    propsStore.setPostalcodeHeatTimeseries(heatExposureData[1]);
    propsStore.setHeatHistogramData(avg_temp_cList);
    const buildingStore = useBuildingStore();
    buildingStore.setBuildingFeatures(data);
    eventBus.emit('showCapitalRegion');
};
