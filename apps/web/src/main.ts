import './app.css';
import { setHashRoutingEnabled } from '@keenmate/svelte-spa-router/utils';
import { mount } from 'svelte';
import App from './App.svelte';

setHashRoutingEnabled(false);

const target = document.getElementById('app');

if (!target) {
  throw new Error('Missing #app mount point');
}

mount(App, { target });
