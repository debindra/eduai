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
import DashboardPage from '../features/admin/DashboardPage.svelte';
import InboxPage from '../features/messaging/InboxPage.svelte';
import AdminInboxPage from '../features/messaging/AdminInboxPage.svelte';
import ManagePage from '../features/manage/ManagePage.svelte';
import AdminManagePage from '../features/manage/AdminManagePage.svelte';
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
  '/admin/dashboard': createProtectedRoute({
    component: async () => DashboardPage,
    permissions: routePermissions.admin,
  }),
  '/admin/messaging': createProtectedRoute({
    component: async () => AdminInboxPage,
    permissions: routePermissions.admin,
  }),
  '/admin/manage': createProtectedRoute({
    component: async () => AdminManagePage,
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
  '/teacher/messaging': createProtectedRoute({
    component: async () => InboxPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/manage': createProtectedRoute({
    component: async () => ManagePage,
    permissions: routePermissions.teacher,
  }),
};
