import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  checkDatabaseConnection,
  createServiceClient,
  type SupabaseClient,
  type SupabaseEnv,
} from '@eduai/db';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceRoleKey) {
      return;
    }
    const env: SupabaseEnv = { url, anonKey: '', serviceRoleKey };
    this.client = createServiceClient(env);
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  async ping(): Promise<{ ok: boolean; schoolCount: number | null; error?: string }> {
    if (!this.client) {
      return {
        ok: false,
        schoolCount: null,
        error: 'Supabase is not configured',
      };
    }
    return checkDatabaseConnection(this.client);
  }
}
