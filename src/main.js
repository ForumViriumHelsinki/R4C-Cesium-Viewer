import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import { aliases, mdi } from "vuetify/iconsets/mdi";
import { md1 } from "vuetify/blueprints";

const vuetify = createVuetify({
    components,
    directives,
    blueprint: md1,
    icons: {
        defaultSet: "mdi",
        aliases,
        sets: {
            mdi,
        },
    },
});

const pinia = createPinia();
const app = createApp( App );

app.use( pinia );
app.use( vuetify );
app.mount( '#app' );
