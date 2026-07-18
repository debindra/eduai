import { createProtectedRoute } from '@keenmate/svelte-spa-router/helpers/permissions';
import Home from '../pages/Home.svelte';
import Health from '../pages/Health.svelte';
import LoginPage from '../features/auth/LoginPage.svelte';
import RecoveryPage from '../features/auth/RecoveryPage.svelte';
import CalendarWizard from '../features/calendar/CalendarWizard.svelte';
import { routePermissions } from './permissions';

export const routes = {
  '/': Home,
  '/health': Health,
  '/login': LoginPage,
  '/login/recovery': RecoveryPage,
  '/admin/calendar': createProtectedRoute({
    component: async () => CalendarWizard,
    permissions: routePermissions.admin,
  }),
};
