import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AdminNav from './AdminNav.svelte';
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

describe('AdminNav', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      accessToken: 't',
      identity: {
        id: 'i1',
        email: 'admin@schoolx.dev',
        phone: null,
        displayName: 'School Admin',
      },
      memberType: 'admin',
      schoolId: 'school-1',
    });
  });

  it('links to all admin routes', () => {
    render(AdminNav);
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/admin/calendar');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin/dashboard');
    expect(screen.getByRole('link', { name: 'Messaging' })).toHaveAttribute('href', '/admin/messaging');
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/admin/manage');
  });
});
