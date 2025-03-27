import { defineStore } from 'pinia';

export const useMitigationStore = defineStore( 'mitigation', {
    state: () => ( {
        coolingCenters: [],	
        reachability: 4,	
    } ),
    actions: {
        addCoolingCenter(  coolingCenter ){
            this.coolingCenters.push( coolingCenter );
        },
    },
} );