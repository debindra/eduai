import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/shared/api/client';
import { getHealth } from './api';

const mockApiFetch = vi.mocked(apiFetch);

describe('health api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /health without auth', async () => {
    mockApiFetch.mockResolvedValue({
      status: 'ok',
      dbPackage: '0.0.0',
      database: { configured: true, ok: true, schoolCount: 1 },
    });

    const actual = await getHealth();

    expect(actual.status).toBe('ok');
    expect(mockApiFetch).toHaveBeenCalledWith('/health', { auth: false });
  });
});
