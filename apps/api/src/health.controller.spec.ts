import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';
import type { SupabaseService } from './database/supabase.service';

describe('HealthController GET /health', () => {
  let controller: HealthController;
  let supabase: {
    isConfigured: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    supabase = {
      isConfigured: vi.fn(),
      ping: vi.fn(),
    };
    controller = new HealthController(supabase as unknown as SupabaseService);
  });

  it('returns ok when database ping succeeds', async () => {
    supabase.isConfigured.mockReturnValue(true);
    supabase.ping.mockResolvedValue({ ok: true, schoolCount: 1 });

    const actual = await controller.getHealth();

    expect(actual).toEqual({
      status: 'ok',
      dbPackage: expect.any(String),
      database: {
        configured: true,
        ok: true,
        schoolCount: 1,
      },
    });
  });

  it('returns degraded when Supabase is not configured', async () => {
    supabase.isConfigured.mockReturnValue(false);

    const actual = await controller.getHealth();

    expect(actual.status).toBe('degraded');
    expect(actual.database.configured).toBe(false);
    expect(actual.database.ok).toBe(false);
  });
});
