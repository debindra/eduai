import { checkDatabaseConnection } from '@eduai/db';
import { json } from '@sveltejs/kit';
import { getSupabaseServerClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const client = getSupabaseServerClient();

  if (!client) {
    return json({
      status: 'degraded',
      service: 'web',
      database: {
        configured: false,
        ok: false,
        error: 'Supabase is not configured (set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY)',
      },
    });
  }

  const database = await checkDatabaseConnection(client);

  return json({
    status: database.ok ? 'ok' : 'degraded',
    service: 'web',
    database: { configured: true, ...database },
  });
};
