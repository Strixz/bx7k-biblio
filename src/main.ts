import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import './lib/appareil.svelte';

export default mount(App, { target: document.getElementById('app')! });

import { registerSW } from 'virtual:pwa-register';

// Mise à jour silencieuse : la nouvelle version s'applique au prochain lancement.
registerSW({ immediate: true });
