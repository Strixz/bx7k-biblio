import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import './lib/appareil.svelte';
import './lib/miseAJour.svelte';

export default mount(App, { target: document.getElementById('app')! });
