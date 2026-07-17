import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

export function createAnonClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceClient(env: SupabaseEnv): SupabaseClient {
  if (!env.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the service client');
  }
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function checkDatabaseConnection(
  client: SupabaseClient,
): Promise<{ ok: boolean; schoolCount: number | null; error?: string }> {
  const { count, error } = await client
    .from('schools')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return { ok: false, schoolCount: null, error: error.message };
  }

  return { ok: true, schoolCount: count };
}
