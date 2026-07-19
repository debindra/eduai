import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PlatformNav from './PlatformNav.svelte';
import { clearSession, setSession } from '../../lib/shared/stores/session';
import {
  clearSupportSession,
  setSupportSession,
} from '../../lib/shared/stores/support-session';

const push = vi.fn();

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
  push: (...args: unknown[]) => push(...args),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  // Object-form opts only — string path shorthand must not be used for class names.
  default: (_node: HTMLElement, opts: unknown) => {
    if (typeof opts === 'string') {
      throw new Error('Invalid value for "path" argument');
    }
    return { destroy: () => {} };
  },
}));

describe('PlatformNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    clearSupportSession();
    setSession({
      accessToken: 't',
      identity: {
        id: 'pa',
        email: 'platform@eduai.dev',
        phone: null,
        displayName: 'Platform',
      },
      memberType: 'super_admin',
      schoolId: null,
    });
  });

  it('links to platform routes without throwing on active opts', () => {
    render(PlatformNav);
    expect(screen.getByRole('link', { name: 'Tenants' })).toHaveAttribute(
      'href',
      '/platform/schools',
    );
    expect(screen.getByRole('link', { name: 'National calendar' })).toHaveAttribute(
      'href',
      '/platform/national-calendar',
    );
    expect(screen.getByRole('link', { name: 'Support sessions' })).toHaveAttribute(
      'href',
      '/platform/support-sessions',
    );
  });

  it('shows support-session badge and leave clears it', async () => {
    const user = userEvent.setup();
    setSupportSession({
      sessionId: 'sess-1',
      schoolId: 'school-1',
      schoolName: 'School X (dev)',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    render(PlatformNav);
    expect(screen.getByText(/Support: School X \(dev\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.queryByText(/Support:/)).not.toBeInTheDocument();
  });

  it('signs out and navigates to login', async () => {
    const user = userEvent.setup();
    render(PlatformNav);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(push).toHaveBeenCalledWith('/login');
  });
});
