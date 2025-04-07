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
        optimised: false	
    } ),
    actions: {
        async setGridCells( datasource ) {
            this.gridCells = datasource.entities.values
                .filter( entity => entity.properties?.heat_index?.getValue() )
                .map( entity => ({
                    id: entity.properties.grid_id.getValue(),
                    x: entity.properties.euref_x.getValue(),
                    y: entity.properties.euref_y.getValue(),
                    polygon: entity.polygon ? entity.polygon.hierarchy.getValue().positions : null
                }))

        },
        preCalculateGridImpacts( ) {
            if ( !this.gridCells || this.gridCells.length === 0 ) {
                console.warn('Grid cells are not set. Cannot pre-calculate impacts.');
                return;
            }
            const start = Date.now();
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

            console.log("took", Date.now() - start);
            console.log("this.gridImpacts", this.gridImpacts)
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