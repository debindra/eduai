import {
  configurePermissions,
  setCurrentUser,
} from '@keenmate/svelte-spa-router/helpers/permissions';
import { push } from '@keenmate/svelte-spa-router';
import { get } from 'svelte/store';
import { session } from '../lib/shared/stores/session';
import { supportSession } from '../lib/shared/stores/support-session';
import {
  checkPermissions,
  sessionToRouterUser,
} from './permission-logic';

export {
  checkPermissions,
  routePermissions,
  sessionToRouterUser,
  type RouterUser,
} from './permission-logic';

function syncRouterUser(): void {
  const support = get(supportSession);
  setCurrentUser(
    sessionToRouterUser(
      get(session),
      support ? { schoolId: support.schoolId } : null,
    ),
  );
}

/** Wire router permission checks to session — UX only, not a security boundary. */
export function initRouterPermissions(): void {
  configurePermissions({
    checkPermissions,
    onUnauthorized: () => {
      push('/login');
    },
  });

  // Hydrate immediately from restored (localStorage) session before first route guard.
  syncRouterUser();

  session.subscribe(() => {
    syncRouterUser();
  });
  supportSession.subscribe(() => {
    syncRouterUser();
  });
}
