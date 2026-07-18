import {
  configurePermissions,
  setCurrentUser,
} from '@keenmate/svelte-spa-router/helpers/permissions';
import { push } from '@keenmate/svelte-spa-router';
import { session } from '../lib/shared/stores/session';
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

/** Wire router permission checks to session — UX only, not a security boundary. */
export function initRouterPermissions(): void {
  configurePermissions({
    checkPermissions,
    onUnauthorized: () => {
      push('/login');
    },
  });

  session.subscribe((value) => {
    setCurrentUser(sessionToRouterUser(value));
  });
}
