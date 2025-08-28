import { defineStore } from 'pinia';

export const useMitigationStore = defineStore( 'mitigation', {
    state: () => ( {
        coolingCenters: [],	
        reachability: 1000,
        maxReduction: 0.20,
        minReduction: 0.04,
        affected: [],
        impact: 0,
        optimalEffect: 4.64,
        gridImpacts: {}, // Store impact for each grid_id
        gridCells: [], // Add gridCells here
        optimised: false,
        parksEffect: 8,
        parks2022CoolingConstant: 0.177,
        gridArea: 62500,
        effecting1GridCellsCoolingAreaMax: Math.PI * Math.pow(125, 2), // Area = πr² 49087.38521 cooling area, 6135.92315125 park area, 4107 count 
        effecting5GridCellsCoolingAreaMax: Math.PI * ( Math.pow(125, 2) + Math.pow(125, 2) ), // Area = πr²  98175.77042 cooling area, 12271.8463025 park area, 2337 count
        effecting9GridCellsCoolingAreaMax: Math.PI * Math.pow(375, 2), // Area = πr²  441786.46691 cooling area, 55223.3083638 park area, 0 count, 54983.17882646234 highest
        heatReducedByParks: 0,
        totalAreaEffected: 0,
        percentageMax: 0,
        modifiedHeatIndices: {},
    } ),
    actions: {
        async setGridCells(datasource) {
            this.gridCells = datasource.entities.values
                .filter(entity => entity.properties?.final_avg_conditional?.getValue() != null)
                .map(entity => {
                    const gridId = entity.properties.grid_id.getValue();
                    const heatIndex = entity.properties.final_avg_conditional.getValue();
                    
                    this.modifiedHeatIndices[gridId] = heatIndex;

                    return {
                        id: gridId,
                        x: entity.properties.euref_x.getValue(),
                        y: entity.properties.euref_y.getValue(),
                        entity: entity,
                    };
                });
        },
        /**
         * Calculates the new heat index for a single entity,
         * factoring in the effect of all active cooling centers.
         */
        calculateCoolingCenterEffect(entity) {
            let heatIndexValue = entity.properties['heat_index']?.getValue();
            if (heatIndexValue == null) return null;

            const euref_x = entity.properties['euref_x']?.getValue();
            const euref_y = entity.properties['euref_y']?.getValue();
            
            let totalReduction = 0;
            
            for (const center of this.coolingCenters) {
                const distance = Math.sqrt(
                    Math.pow(center.euref_x - euref_x, 2) + Math.pow(center.euref_y - euref_y, 2)
                );
                const currentReduction = this.getReductionValue(distance);
                if (currentReduction > 0) {
                    totalReduction += currentReduction;
                }
            }
            return Math.max(0, heatIndexValue - totalReduction);
        },
        calculateTotalReductionForCell(entity) {
            const euref_x = entity.properties['euref_x']?.getValue();
            const euref_y = entity.properties['euref_y']?.getValue();
            
            let totalReduction = 0;
            if (euref_x == null || euref_y == null) return 0;
            
            for (const center of this.coolingCenters) {
                const distance = Math.sqrt(
                    Math.pow(center.euref_x - euref_x, 2) + Math.pow(center.euref_y - euref_y, 2)
                );
                totalReduction += this.getReductionValue(distance);
            }
            return totalReduction;
        },
        // ** NEW HELPER ACTION to find neighbors **
        findNearestNeighbors(sourceCellId, maxDistance) {
            const sourceCell = this.gridCells.find(c => c.id === sourceCellId);
            if (!sourceCell) return [];

            return this.gridCells
                .filter(c => c.id !== sourceCellId)
                .map(neighbor => ({
                    ...neighbor,
                    distance: Math.sqrt(Math.pow(sourceCell.x - neighbor.x, 2) + Math.pow(sourceCell.y - neighbor.y, 2))
                }))
                // ** NEW: Filter out neighbors that are too far away **
                .filter(neighbor => neighbor.distance <= maxDistance)
                .sort((a, b) => a.distance - b.distance) // Sort by distance
                .slice(0, 8); // Still cap at 8, just in case
        },
        calculateParksEffect(sourceEntity, totalAreaConverted) {
            const heatReductions = []; // Array to store the results
            this.totalHeatReduction = 0;
            this.neighborCellsAffected = 0;

            const sourceReduction = (totalAreaConverted / this.gridArea) * this.parks2022CoolingConstant;
            
            heatReductions.push({ grid_id: sourceEntity.properties.grid_id.getValue(), heatReduction: sourceReduction });

            const originalIndex = sourceEntity.properties.final_avg_conditional.getValue();
            const newIndex = Math.max(0, originalIndex - sourceReduction);

            const areaOfInfluence = totalAreaConverted * this.parksEffect;
            const coolingRadius = Math.sqrt(areaOfInfluence / Math.PI);
            const neighbors = this.findNearestNeighbors(sourceEntity.properties.grid_id.getValue(), coolingRadius);
            
            neighbors.forEach((neighbor, index) => {
                let neighborReduction = 0;

                // Apply logic to the 4 closest neighbors
                if (index < 4) {
                    if (areaOfInfluence >= this.effecting5GridCellsCoolingAreaMax) {
                        neighborReduction = this.parks2022CoolingConstant * 0.5;
                    } else if (areaOfInfluence > this.effecting1GridCellsCoolingAreaMax) {
                        const range = this.effecting5GridCellsCoolingAreaMax - this.effecting1GridCellsCoolingAreaMax;
                        const progress = areaOfInfluence - this.effecting1GridCellsCoolingAreaMax;
                        neighborReduction = this.parks2022CoolingConstant * ((progress / range) * 0.5);
                    }
                } else {
                     if (areaOfInfluence >= this.effecting9GridCellsCoolingAreaMax) {
                        neighborReduction = this.parks2022CoolingConstant * 0.25;
                    } else if (areaOfInfluence > this.effecting5GridCellsCoolingAreaMax) {
                        const range = this.effecting9GridCellsCoolingAreaMax - this.effecting5GridCellsCoolingAreaMax;
                        const progress = areaOfInfluence - this.effecting5GridCellsCoolingAreaMax;
                        neighborReduction = this.parks2022CoolingConstant * ((progress / range) * 0.25);
                    }
                }

                if (neighborReduction > 0) {
                    heatReductions.push({ grid_id: neighbor.id, heatReduction: neighborReduction });
                    this.neighborCellsAffected++;
                }
            });

            return {
                heatReductions, // <-- **THE FIX: Add the array to the return object**
                sourceNewIndex: newIndex,
                sourceReduction: sourceReduction,
                totalCoolingArea: areaOfInfluence,
                neighborsAffected: this.neighborCellsAffected,
            };
        }, 
        preCalculateGridImpacts( ) {
            if ( !this.gridCells || this.gridCells.length === 0 ) {
                console.warn('Grid cells are not set. Cannot pre-calculate impacts.');
                return;
            }
            this.gridCells.forEach( ( cell ) => {
                let totalReduction = 0;
                this.gridCells.forEach((otherCell) => {
                // Check if otherCell is within 1000 units in both x and y
                    if ( Math.abs( cell.x - otherCell.x ) <= 1000 && Math.abs( cell.y - otherCell.y ) <= 1000 ) {
                        const distance = Math.sqrt( Math.pow( cell.x - otherCell.x, 2 ) + Math.pow( cell.y - otherCell.y, 2 ) );
                        totalReduction += this.getReductionValue( distance );
                    }
                });
                this.gridImpacts[ cell.id ] = totalReduction;
            } );

         },
        addCoolingCenter( coolingCenter ) {
            this.coolingCenters.push( coolingCenter );
        },
        addCell( id ) {
            !this.affected.includes( id ) && this.affected.push( id );
        },
        addImpact( impact ) {
            this.impact += impact;
        },
        resetStore() {
            this.coolingCenters = [];
            this.affected = [];
            this.impact = 0;
            this.optimised = false;
        },
        getCoolingCenterCount(gridId) {
            return this.coolingCenters.filter(center => center.grid_id === gridId).length;
        },        
        getCoolingCapacity(gridId) {
            return this.coolingCenters
                .filter(center => center.grid_id === gridId)
                .reduce((total, center) => total + center.capacity, 0);
        },
        getReductionValue(distance) {
            return distance > this.reachability
                ? 0
                : this.maxReduction - (distance / this.reachability) * (this.maxReduction - this.minReduction);
        },
        getGridImpact(gridId) {
            return this.gridImpacts[gridId] || 0;
        },        
    },
});