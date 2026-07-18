import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage.svelte';

const mockPush = vi.fn();

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({
    destroy: () => {},
  }),
  push: (...args: unknown[]) => mockPush(...args),
}));

vi.mock('./api', () => ({
  login: vi.fn(),
}));

import { login } from './api';

const mockLogin = vi.mocked(login);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows server error when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    const user = userEvent.setup();

    render(LoginPage);

    await user.type(screen.getByLabelText('Username'), 'bad@school.dev');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects admin to calendar wizard after successful login', async () => {
    mockLogin.mockResolvedValue({
      accessToken: 'token-1',
      refreshToken: 'refresh-1',
      expiresIn: 3600,
      identity: {
        id: 'identity-1',
        email: 'admin@schoolx.dev',
        phone: null,
        displayName: 'Admin',
      },
      memberType: 'admin',
      schoolId: 'school-1',
    });
    const user = userEvent.setup();

    render(LoginPage);

    await user.type(screen.getByLabelText('Username'), 'admin@schoolx.dev');
    await user.type(screen.getByLabelText('Password'), 'DevPassword123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/calendar');
    });
  });
});
