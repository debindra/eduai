import { createAnonClient, type SupabaseClient } from '@eduai/db';
import { env } from '$env/dynamic/private';

let client: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = env.PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!client) {
    client = createAnonClient({ url, anonKey });
  }

  return client;
}
