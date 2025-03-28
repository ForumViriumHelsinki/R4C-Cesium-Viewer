import { defineStore } from 'pinia';

export const useMitigationStore = defineStore( 'mitigation', {
    state: () => ( {
        coolingCenters: [],	
        reachability: 1000,
        affected: [],
        impact: 0	
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
        }
    },
});