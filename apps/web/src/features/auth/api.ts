import { apiFetch } from '../../lib/shared/api/client';
import type { components } from '../../lib/shared/api/generated-types';
import { setSession, type MemberType } from '../../lib/shared/stores/session';

type LoginRequest = components['schemas']['LoginRequest'];
type LoginResponse = components['schemas']['LoginResponse'];
type RecoveryOtpRequest = components['schemas']['RecoveryOtpRequest'];
type VerifyRecoveryRequest = components['schemas']['VerifyRecoveryRequest'];
type MessageResponse = components['schemas']['MessageResponse'];

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  setSession({
    accessToken: response.accessToken,
    identity: response.identity,
    memberType: response.memberType as MemberType,
    schoolId: response.schoolId,
  });
  return response;
}

export async function requestRecoveryOtp(
  payload: RecoveryOtpRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>('/auth/request-recovery-otp', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function verifyRecoveryOtpAndSetPassword(
  payload: VerifyRecoveryRequest,
): Promise<MessageResponse> {
  return apiFetch<MessageResponse>(
    '/auth/verify-recovery-otp-and-set-password',
    {
      method: 'POST',
      body: payload,
      auth: false,
    },
  );
}
