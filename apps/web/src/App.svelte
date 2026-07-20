<script lang="ts">
  import Router from '@keenmate/svelte-spa-router';
  import { routes } from './router/routes';
  import { initRouterPermissions } from './router/permissions';
  import ConfirmDialogHost from './lib/shared/components/ConfirmDialogHost.svelte';

  initRouterPermissions();
</script>

<Router {routes} />
<ConfirmDialogHost />
