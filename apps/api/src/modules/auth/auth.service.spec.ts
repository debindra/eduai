import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import type { AuthProviderPort } from '../../shared/ports/auth-provider.port';
import type { MessagingProviderPort } from '../../shared/ports/messaging-provider.port';
import type { OtpFallbackPort } from '../../shared/ports/otp-fallback.port';
import type { SupabaseService } from '../../database/supabase.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createThenableResult<T>(result: T) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: undefined as unknown,
  };
  // Support `await client.from(...).select(...).eq(...)` without terminal.
  builder.then = (
    resolve: (value: T) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('AuthService.resolveIdentifierToEmail', () => {
  const service = new AuthService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it('passes through a real email unchanged (lowercased)', () => {
    const actual = service.resolveIdentifierToEmail('Teacher@SchoolX.dev');
    expect(actual).toBe('teacher@schoolx.dev');
  });

  it('maps a mobile number to the synthetic internal email', () => {
    const actual = service.resolveIdentifierToEmail('+977 980-000-0000');
    expect(actual).toBe('9779800000000@phone.eduai.internal');
  });

  it('rejects identifiers that are neither email nor valid mobile', () => {
    expect(() => service.resolveIdentifierToEmail('abc')).toThrow(
      BadRequestException,
    );
  });
});

describe('AuthService invite accept and recovery', () => {
  let service: AuthService;
  let authProvider: {
    signInWithPassword: ReturnType<typeof vi.fn>;
    inviteByEmail: ReturnType<typeof vi.fn>;
    createUserWithPassword: ReturnType<typeof vi.fn>;
    setPassword: ReturnType<typeof vi.fn>;
  };
  let messaging: {
    sendInviteToken: ReturnType<typeof vi.fn>;
    sendRecoveryOtp: ReturnType<typeof vi.fn>;
  };
  let otpFallback: { sendSmsOtp: ReturnType<typeof vi.fn> };
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authProvider = {
      signInWithPassword: vi.fn(),
      inviteByEmail: vi.fn(),
      createUserWithPassword: vi.fn(),
      setPassword: vi.fn(),
    };
    messaging = {
      sendInviteToken: vi.fn(),
      sendRecoveryOtp: vi.fn(),
    };
    otpFallback = { sendSmsOtp: vi.fn() };
    from = vi.fn();
    service = new AuthService(
      { getClient: () => ({ from }) } as unknown as SupabaseService,
      authProvider as unknown as AuthProviderPort,
      messaging as unknown as MessagingProviderPort,
      otpFallback as unknown as OtpFallbackPort,
    );
  });

  describe('login', () => {
    it('returns session identity membership and display name for admin', async () => {
      authProvider.signInWithPassword.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: { id: 'auth-1' },
      });
      from.mockImplementation((table: string) => {
        if (table === 'identities') {
          return createThenableResult({
            data: {
              id: 'id-1',
              email: 'admin@schoolx.dev',
              phone: null,
              account_status: 'active',
            },
            error: null,
          });
        }
        if (table === 'school_memberships') {
          return createThenableResult({
            data: {
              id: 'mem-1',
              school_id: 'school-1',
              member_type: 'admin',
              status: 'active',
            },
            error: null,
          });
        }
        if (table === 'school_admins') {
          return createThenableResult({
            data: { display_name: 'School X Admin' },
            error: null,
          });
        }
        throw new Error(`unexpected ${table}`);
      });

      const actual = await service.login('admin@schoolx.dev', 'DevPassword123!');

      expect(actual).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        identity: {
          id: 'id-1',
          email: 'admin@schoolx.dev',
          phone: null,
          displayName: 'School X Admin',
        },
        memberType: 'admin',
        schoolId: 'school-1',
      });
    });

    it('maps provider failures to UnauthorizedException', async () => {
      authProvider.signInWithPassword.mockRejectedValue(new Error('Email logins are disabled'));
      await expect(service.login('admin@schoolx.dev', 'bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when identity is not active', async () => {
      authProvider.signInWithPassword.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: { id: 'auth-1' },
      });
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            email: 'admin@schoolx.dev',
            phone: null,
            account_status: 'invited',
          },
          error: null,
        }),
      );
      await expect(
        service.login('admin@schoolx.dev', 'DevPassword123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when there is no active admin/teacher membership', async () => {
      authProvider.signInWithPassword.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 3600,
        user: { id: 'auth-1' },
      });
      from.mockImplementation((table: string) => {
        if (table === 'identities') {
          return createThenableResult({
            data: {
              id: 'id-1',
              email: 'admin@schoolx.dev',
              phone: null,
              account_status: 'active',
            },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      await expect(
        service.login('admin@schoolx.dev', 'DevPassword123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('invite', () => {
    it('rejects when neither email nor phone is provided', async () => {
      await expect(
        service.invite({
          schoolId: 'school-1',
          memberType: 'teacher',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when both email and phone are provided', async () => {
      await expect(
        service.invite({
          schoolId: 'school-1',
          memberType: 'teacher',
          email: 't@school.dev',
          phone: '9800000000',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('invites by email and creates teacher membership', async () => {
      authProvider.inviteByEmail.mockResolvedValue(undefined);
      from.mockImplementation((table: string) => {
        if (table === 'identities') {
          return createThenableResult({ data: { id: 'id-new' }, error: null });
        }
        if (table === 'school_memberships') {
          return createThenableResult({ data: { id: 'mem-new' }, error: null });
        }
        if (table === 'teachers') {
          return createThenableResult({ data: null, error: null });
        }
        throw new Error(`unexpected ${table}`);
      });

      const actual = await service.invite({
        schoolId: 'school-1',
        memberType: 'teacher',
        email: 'teacher@school.dev',
        displayName: 'New Teacher',
      });

      expect(actual).toEqual({ identityId: 'id-new', delivery: 'email' });
      expect(authProvider.inviteByEmail).toHaveBeenCalledWith('teacher@school.dev');
    });

    it('invites by mobile and sends WhatsApp token', async () => {
      messaging.sendInviteToken.mockResolvedValue(undefined);
      from.mockImplementation((table: string) => {
        if (table === 'identities') {
          return createThenableResult({ data: { id: 'id-mobile' }, error: null });
        }
        if (table === 'school_memberships') {
          return createThenableResult({ data: { id: 'mem-mobile' }, error: null });
        }
        if (table === 'school_admins') {
          return createThenableResult({ data: null, error: null });
        }
        throw new Error(`unexpected ${table}`);
      });

      const actual = await service.invite({
        schoolId: 'school-1',
        memberType: 'admin',
        phone: '+977 980-111-2222',
      });

      expect(actual).toEqual({ identityId: 'id-mobile', delivery: 'mobile' });
      expect(messaging.sendInviteToken).toHaveBeenCalledWith(
        '+977 980-111-2222',
        expect.any(String),
        'whatsapp',
      );
    });
  });

  describe('acceptInvite', () => {
    it('rejects when invite identity is missing', async () => {
      from.mockReturnValue(
        createThenableResult({ data: null, error: { message: 'missing' } }),
      );
      await expect(
        service.acceptInvite({
          identityId: 'missing',
          token: 'tok',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when invite is no longer invited', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            phone: '9800000000',
            email: null,
            auth_user_id: null,
            account_status: 'active',
            invite_token_hash: 'x',
            invite_expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
          error: null,
        }),
      );
      await expect(
        service.acceptInvite({
          identityId: 'id-1',
          token: 'tok',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid invite token', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            phone: '9800000000',
            email: null,
            auth_user_id: null,
            account_status: 'invited',
            invite_token_hash: hashToken('good-token'),
            invite_expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
          error: null,
        }),
      );
      await expect(
        service.acceptInvite({
          identityId: 'id-1',
          token: 'bad-token',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('activates a mobile invite on valid token', async () => {
      const token = 'good-token';
      const selectBuilder = createThenableResult({
        data: {
          id: 'id-1',
          phone: '9800000000',
          email: null,
          auth_user_id: null,
          account_status: 'invited',
          invite_token_hash: hashToken(token),
          invite_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      });
      const updateBuilder = createThenableResult({ data: null, error: null });
      let call = 0;
      from.mockImplementation(() => {
        call += 1;
        return call === 1 ? selectBuilder : updateBuilder;
      });
      authProvider.createUserWithPassword.mockResolvedValue({ id: 'auth-1' });

      const actual = await service.acceptInvite({
        identityId: 'id-1',
        token,
        password: 'Password123!',
      });

      expect(actual).toEqual({ message: 'Invite accepted' });
      expect(authProvider.createUserWithPassword).toHaveBeenCalledWith(
        '9800000000@phone.eduai.internal',
        'Password123!',
      );
    });
  });

  describe('requestRecoveryOtp', () => {
    it('rejects when account has no phone', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: 'auth-1',
            email: 'a@b.com',
            phone: null,
            account_status: 'active',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      await expect(service.requestRecoveryOtp('a@b.com')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when account is not active', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: null,
            email: null,
            phone: '9800000000',
            account_status: 'invited',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      await expect(
        service.requestRecoveryOtp('9800000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('sends recovery OTP over WhatsApp when eligible', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: 'auth-1',
            email: null,
            phone: '9800000000',
            account_status: 'active',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      messaging.sendRecoveryOtp.mockResolvedValue(undefined);

      const actual = await service.requestRecoveryOtp('9800000000');

      expect(actual).toEqual({ message: 'Recovery OTP sent' });
      expect(messaging.sendRecoveryOtp).toHaveBeenCalledWith(
        '9800000000',
        expect.stringMatching(/^\d{6}$/),
        'whatsapp',
      );
    });
  });

  describe('verifyRecoveryOtpAndSetPassword', () => {
    it('rejects when OTP was never requested', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: 'auth-1',
            email: null,
            phone: '9800000000',
            account_status: 'active',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      await expect(
        service.verifyRecoveryOtpAndSetPassword({
          identifier: '9800000000',
          otp: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an invalid OTP after request', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: 'auth-1',
            email: null,
            phone: '9800000000',
            account_status: 'active',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      messaging.sendRecoveryOtp.mockResolvedValue(undefined);
      await service.requestRecoveryOtp('9800000000');

      await expect(
        service.verifyRecoveryOtpAndSetPassword({
          identifier: '9800000000',
          otp: '000000',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authProvider.setPassword).not.toHaveBeenCalled();
    });

    it('sets password when OTP matches', async () => {
      from.mockReturnValue(
        createThenableResult({
          data: {
            id: 'id-1',
            auth_user_id: 'auth-1',
            email: null,
            phone: '9800000000',
            account_status: 'active',
            invite_token_hash: null,
            invite_expires_at: null,
          },
          error: null,
        }),
      );
      let capturedOtp = '';
      messaging.sendRecoveryOtp.mockImplementation(
        async (_phone: string, otp: string) => {
          capturedOtp = otp;
        },
      );
      authProvider.setPassword.mockResolvedValue(undefined);

      await service.requestRecoveryOtp('9800000000');
      const actual = await service.verifyRecoveryOtpAndSetPassword({
        identifier: '9800000000',
        otp: capturedOtp,
        newPassword: 'NewPassword123!',
      });

      expect(actual).toEqual({ message: 'Password updated' });
      expect(authProvider.setPassword).toHaveBeenCalledWith(
        'auth-1',
        'NewPassword123!',
      );
    });
  });
});
