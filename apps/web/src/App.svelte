<script lang="ts">
  import Router from 'svelte-spa-router';
  import Home from './pages/Home.svelte';
  import Health from './pages/Health.svelte';

  const routes = {
    '/': Home,
    '/health': Health,
  };
</script>

<Router {routes} />
