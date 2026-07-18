import { apiFetch } from '../../lib/shared/api/client';
import type { components } from '../../lib/shared/api/generated-types';

export type HealthResponse = components['schemas']['HealthResponse'];

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { auth: false });
}
