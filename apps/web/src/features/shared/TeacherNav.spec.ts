import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TeacherNav from './TeacherNav.svelte';
import { clearSession, setSession } from '../../lib/shared/stores/session';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/utils', () => ({
  push: vi.fn(),
}));

describe('TeacherNav', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      accessToken: 't',
      identity: {
        id: 'i1',
        email: 'teacher@schoolx.dev',
        phone: null,
        displayName: 'UKG Teacher',
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });
  });

  it('links to all teacher Phase 1–2 routes', () => {
    render(TeacherNav);
    expect(screen.getByRole('link', { name: 'Attendance' })).toHaveAttribute(
      'href',
      '/teacher/attendance',
    );
    expect(screen.getByRole('link', { name: 'Sweep' })).toHaveAttribute('href', '/teacher/sweep');
    expect(screen.getByRole('link', { name: 'Weekly' })).toHaveAttribute('href', '/teacher/weekly');
    expect(screen.getByRole('link', { name: 'Lesson' })).toHaveAttribute('href', '/teacher/lesson');
    expect(screen.getByRole('link', { name: 'Pacing' })).toHaveAttribute('href', '/teacher/pacing');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/teacher/reports');
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/teacher/messaging');
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/teacher/manage');
  });
});
