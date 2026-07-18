import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController endpoints', () => {
  let controller: AuthController;
  let authService: {
    login: ReturnType<typeof vi.fn>;
    invite: ReturnType<typeof vi.fn>;
    acceptInvite: ReturnType<typeof vi.fn>;
    requestRecoveryOtp: ReturnType<typeof vi.fn>;
    verifyRecoveryOtpAndSetPassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      invite: vi.fn(),
      acceptInvite: vi.fn(),
      requestRecoveryOtp: vi.fn(),
      verifyRecoveryOtpAndSetPassword: vi.fn(),
    };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('POST /auth/login delegates to AuthService.login', async () => {
    const session = {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 3600,
      identity: {
        id: 'id-1',
        email: 'admin@schoolx.dev',
        phone: null,
        displayName: 'Admin',
      },
      memberType: 'admin' as const,
      schoolId: 'school-1',
    };
    authService.login.mockResolvedValue(session);

    const actual = await controller.login({
      identifier: 'admin@schoolx.dev',
      password: 'DevPassword123!',
    });

    expect(authService.login).toHaveBeenCalledWith(
      'admin@schoolx.dev',
      'DevPassword123!',
    );
    expect(actual).toEqual(session);
  });

  it('POST /auth/invite delegates to AuthService.invite', async () => {
    authService.invite.mockResolvedValue({
      identityId: 'id-1',
      delivery: 'email',
    });
    const dto = {
      schoolId: 'school-1',
      memberType: 'teacher' as const,
      email: 't@school.dev',
    };

    const actual = await controller.invite(dto);

    expect(authService.invite).toHaveBeenCalledWith(dto);
    expect(actual).toEqual({ identityId: 'id-1', delivery: 'email' });
  });

  it('POST /auth/accept-invite delegates to AuthService.acceptInvite', async () => {
    authService.acceptInvite.mockResolvedValue({ message: 'Invite accepted' });
    const dto = {
      identityId: 'id-1',
      token: 'tok',
      password: 'Password123!',
    };

    const actual = await controller.acceptInvite(dto);

    expect(authService.acceptInvite).toHaveBeenCalledWith(dto);
    expect(actual).toEqual({ message: 'Invite accepted' });
  });

  it('POST /auth/request-recovery-otp delegates to AuthService', async () => {
    authService.requestRecoveryOtp.mockResolvedValue({
      message: 'Recovery OTP sent',
    });

    const actual = await controller.requestRecoveryOtp({
      identifier: '9800000000',
    });

    expect(authService.requestRecoveryOtp).toHaveBeenCalledWith('9800000000');
    expect(actual).toEqual({ message: 'Recovery OTP sent' });
  });

  it('POST /auth/verify-recovery-otp-and-set-password delegates to AuthService', async () => {
    authService.verifyRecoveryOtpAndSetPassword.mockResolvedValue({
      message: 'Password updated',
    });
    const dto = {
      identifier: '9800000000',
      otp: '123456',
      newPassword: 'NewPassword123!',
    };

    const actual = await controller.verifyRecoveryOtpAndSetPassword(dto);

    expect(authService.verifyRecoveryOtpAndSetPassword).toHaveBeenCalledWith(dto);
    expect(actual).toEqual({ message: 'Password updated' });
  });
});
