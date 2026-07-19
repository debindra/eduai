import { apiFetch } from '../../lib/shared/api/client';

/** Health endpoint has no Swagger response DTO — keep shape local. */
export type HealthResponse = {
  status: string;
  dbPackage: string;
  database: {
    configured: boolean;
    ok: boolean;
    schoolCount: number | null;
    error?: string;
  };
};

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { auth: false });
}
