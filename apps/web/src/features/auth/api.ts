import { apiFetch } from '../../lib/shared/api/client';
import type { components } from '../../lib/shared/api/generated-types';
import { setSession, type MemberType } from '../../lib/shared/stores/session';
import {
  clearTeacherContext,
  loadTeacherContext,
} from '../../lib/shared/stores/teacher-context';

type LoginRequest = components['schemas']['LoginDto'];
type LoginResponse = components['schemas']['AuthSessionResponseDto'];
type RecoveryOtpRequest = components['schemas']['RequestRecoveryOtpDto'];
type VerifyRecoveryRequest = components['schemas']['VerifyRecoveryOtpDto'];
type MessageResponse = components['schemas']['MessageResponseDto'];

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  setSession({
    accessToken: response.accessToken,
    identity: {
      id: response.identity.id,
      email: response.identity.email ?? null,
      phone: response.identity.phone ?? null,
      displayName: response.identity.displayName ?? null,
    },
    memberType: response.memberType as MemberType,
    schoolId: response.schoolId ?? null,
  });
  if (response.memberType === 'teacher') {
    await loadTeacherContext();
  } else {
    clearTeacherContext();
  }
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
