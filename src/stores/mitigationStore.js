import { defineStore } from 'pinia';

export const useMitigationStore = defineStore( 'mitigation', {
    state: () => ( {
        coolingCenters: [],	
        reachability: 1000,
        maxReduction: 0.20,
        minReduction: 0.04,
        affected: [],
        impact: 0,
        optimalEffect: 4.64	
    } ),
    actions: {
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
        },
        getCoolingCenterCount(gridId) {
            return this.coolingCenters.filter(center => center.grid_id === gridId).length;
        },        
        getCoolingCapacity(gridId) {
            return this.coolingCenters
                .filter(center => center.grid_id === gridId)
                .reduce((total, center) => total + center.capacity, 0);
        }
    },
});