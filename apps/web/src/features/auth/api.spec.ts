import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession } from '../../lib/shared/stores/session';
import { clearTeacherContext } from '../../lib/shared/stores/teacher-context';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/shared/api/client';
import { login, requestRecoveryOtp, verifyRecoveryOtpAndSetPassword } from './api';

const mockApiFetch = vi.mocked(apiFetch);

describe('auth api', () => {
  beforeEach(() => {
    clearSession();
    clearTeacherContext();
    vi.clearAllMocks();
  });

  it('login stores session from the response', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        accessToken: 'token-1',
        identity: {
          id: 'identity-1',
          email: 'teacher@schoolx.dev',
          phone: null,
          displayName: 'Jane',
        },
        memberType: 'teacher',
        schoolId: 'school-1',
      })
      .mockResolvedValueOnce({
        teacherId: 'teacher-1',
        assignments: [
          {
            sectionId: 'sec-1',
            sectionName: 'UKG A',
            grade: 'UKG',
            bandId: 'band-pp',
            assessmentMode: 'three_state_narrative',
            subjectId: null,
            subjectName: null,
            isClassTeacher: true,
          },
        ],
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
    expect(mockApiFetch).toHaveBeenCalledWith('/teacher/me/context');
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
