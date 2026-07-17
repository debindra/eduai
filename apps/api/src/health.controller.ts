import { Controller, Get } from '@nestjs/common';
import { DB_PACKAGE_VERSION } from '@eduai/db';
import { SupabaseService } from './database/supabase.service';

@Controller()
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('health')
  async getHealth(): Promise<{
    status: string;
    dbPackage: string;
    database: { configured: boolean; ok: boolean; schoolCount: number | null; error?: string };
  }> {
    const database = this.supabase.isConfigured()
      ? await this.supabase.ping()
      : {
          ok: false,
          schoolCount: null,
          error: 'Supabase is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
        };

    return {
      status: database.ok ? 'ok' : 'degraded',
      dbPackage: DB_PACKAGE_VERSION,
      database: {
        configured: this.supabase.isConfigured(),
        ...database,
      },
    };
  }
}
