import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import Particles from '@tsparticles/vue3';
import { loadFull } from 'tsparticles';

const app = createApp(App);

app.use(Particles, {
    init: async (engine) => {
        await loadFull(engine);
    },
});

app.use(router);
app.use(createPinia());

app.mount('#app');
