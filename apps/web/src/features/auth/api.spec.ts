import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession } from '../../lib/shared/stores/session';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/shared/api/client';
import { login, requestRecoveryOtp, verifyRecoveryOtpAndSetPassword } from './api';

const mockApiFetch = vi.mocked(apiFetch);

describe('auth api', () => {
  beforeEach(() => {
    clearSession();
    vi.clearAllMocks();
  });

  it('login stores session from the response', async () => {
    mockApiFetch.mockResolvedValue({
      accessToken: 'token-1',
      identity: {
        id: 'identity-1',
        email: 'teacher@schoolx.dev',
        phone: null,
        displayName: 'Jane',
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });

    const actual = await login({
      identifier: 'teacher@schoolx.dev',
      password: 'secret',
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { identifier: 'teacher@schoolx.dev', password: 'secret' },
      auth: false,
    });
    expect(actual.accessToken).toBe('token-1');
    expect(getSession()).toEqual({
      accessToken: 'token-1',
      identity: {
        id: 'identity-1',
        email: 'teacher@schoolx.dev',
        phone: null,
        displayName: 'Jane',
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });
  });

  it('requestRecoveryOtp calls the recovery endpoint without auth', async () => {
    mockApiFetch.mockResolvedValue({ message: 'Recovery OTP sent' });

    const actual = await requestRecoveryOtp({ identifier: '9800000000' });

    expect(actual).toEqual({ message: 'Recovery OTP sent' });
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/request-recovery-otp', {
      method: 'POST',
      body: { identifier: '9800000000' },
      auth: false,
    });
  });

  it('verifyRecoveryOtpAndSetPassword posts otp + new password', async () => {
    mockApiFetch.mockResolvedValue({ message: 'Password updated' });

    const actual = await verifyRecoveryOtpAndSetPassword({
      identifier: '9800000000',
      otp: '123456',
      newPassword: 'NewPassword123!',
    });

    expect(actual).toEqual({ message: 'Password updated' });
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/auth/verify-recovery-otp-and-set-password',
      {
        method: 'POST',
        body: {
          identifier: '9800000000',
          otp: '123456',
          newPassword: 'NewPassword123!',
        },
        auth: false,
      },
    );
  });
});
