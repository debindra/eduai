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
import SubjectPage from '../features/subject/SubjectPage.svelte';
import OversightPage from '../features/subject/OversightPage.svelte';
import RemedialPage from '../features/remedial/RemedialPage.svelte';
import AdminRemedialPage from '../features/remedial/AdminRemedialPage.svelte';
import CertificationPage from '../features/certification/CertificationPage.svelte';
import CommunityPage from '../features/community/CommunityPage.svelte';
import RosterPage from '../features/roster/RosterPage.svelte';
import TenantBoardPage from '../features/platform/TenantBoardPage.svelte';
import TenantCalendarPage from '../features/platform/TenantCalendarPage.svelte';
import NationalCalendarPage from '../features/platform/NationalCalendarPage.svelte';
import SupportSessionsPage from '../features/platform/SupportSessionsPage.svelte';
import TeacherCalendarPage from '../features/calendar/TeacherCalendarPage.svelte';
import { routePermissions } from './permissions';

export const routes = {
  '/': Home,
  '/health': Health,
  '/login': LoginPage,
  '/login/recovery': RecoveryPage,
  '/platform/schools/:schoolId/calendar': createProtectedRoute({
    component: async () => TenantCalendarPage,
    permissions: routePermissions.platform,
  }),
  '/platform/schools': createProtectedRoute({
    component: async () => TenantBoardPage,
    permissions: routePermissions.platform,
  }),
  '/platform/national-calendar': createProtectedRoute({
    component: async () => NationalCalendarPage,
    permissions: routePermissions.platform,
  }),
  '/platform/support-sessions': createProtectedRoute({
    component: async () => SupportSessionsPage,
    permissions: routePermissions.platform,
  }),
  '/admin/calendar': createProtectedRoute({
    component: async () => CalendarWizard,
    permissions: routePermissions.admin,
  }),
  '/admin/dashboard': createProtectedRoute({
    component: async () => DashboardPage,
    permissions: routePermissions.admin,
  }),
  '/admin/roster': createProtectedRoute({
    component: async () => RosterPage,
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
  '/admin/remedial': createProtectedRoute({
    component: async () => AdminRemedialPage,
    permissions: routePermissions.admin,
  }),
  '/teacher/calendar': createProtectedRoute({
    component: async () => TeacherCalendarPage,
    permissions: routePermissions.teacher,
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
  '/teacher/subject': createProtectedRoute({
    component: async () => SubjectPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/oversight': createProtectedRoute({
    component: async () => OversightPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/remedial': createProtectedRoute({
    component: async () => RemedialPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/certification': createProtectedRoute({
    component: async () => CertificationPage,
    permissions: routePermissions.teacher,
  }),
  '/teacher/community': createProtectedRoute({
    component: async () => CommunityPage,
    permissions: routePermissions.teacher,
  }),
};
