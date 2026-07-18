import { createProtectedRoute } from '@keenmate/svelte-spa-router/helpers/permissions';
import Home from '../pages/Home.svelte';
import Health from '../pages/Health.svelte';
import LoginPage from '../features/auth/LoginPage.svelte';
import RecoveryPage from '../features/auth/RecoveryPage.svelte';
import CalendarWizard from '../features/calendar/CalendarWizard.svelte';
import SweepPage from '../features/outcomes/SweepPage.svelte';
import WeeklyPlanPage from '../features/planning/WeeklyPlanPage.svelte';
import DailyLessonPage from '../features/lessons/DailyLessonPage.svelte';
import PacingPage from '../features/pacing/PacingPage.svelte';
import ReportReviewPage from '../features/reports/ReportReviewPage.svelte';
import AttendancePage from '../features/attendance/AttendancePage.svelte';
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
  '/teacher/attendance': createProtectedRoute({
    component: async () => AttendancePage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/sweep': createProtectedRoute({
    component: async () => SweepPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/weekly': createProtectedRoute({
    component: async () => WeeklyPlanPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/lesson': createProtectedRoute({
    component: async () => DailyLessonPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/pacing': createProtectedRoute({
    component: async () => PacingPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/reports': createProtectedRoute({
    component: async () => ReportReviewPage,
    permissions: routePermissions.teacher,
  }),
};
