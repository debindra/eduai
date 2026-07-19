import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));
vi.mock('../admin/api', () => ({
  getAdminSchoolId: () => 'school-1',
}));
vi.mock('../../lib/shared/stores/teacher-context', () => ({
  requireSectionId: () => 'section-1',
  requireBandId: () => {
    throw new Error('Not signed in as teacher — band context missing');
  },
}));

import { apiFetch } from '../../lib/shared/api/client';
import { getAdminSettlingProgramme, getSettlingProgramme } from './api';

describe('manage api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSettlingProgramme uses the provided band id', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ bandId: 'band-1', steps: [] });
    await getSettlingProgramme('band-1');
    expect(apiFetch).toHaveBeenCalledWith('/manage/settling-programme/band-1');
  });

  it('getAdminSettlingProgramme resolves a band without teacher context', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        bands: [
          { id: 'early', code: 'early_primary' },
          { id: 'pp', code: 'pre_primary' },
        ],
      })
      .mockResolvedValueOnce({
        bandId: 'pp',
        steps: [{ weekNumber: 1, title: 'Welcome', body: 'Routines' }],
      });

    const result = await getAdminSettlingProgramme();

    expect(result).toEqual({
      bandId: 'pp',
      steps: [{ weekNumber: 1, title: 'Welcome', body: 'Routines' }],
    });
    expect(apiFetch).toHaveBeenNthCalledWith(1, '/bands');
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/manage/settling-programme/pp');
  });

  it('getAdminSettlingProgramme returns null when no bands exist', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ bands: [] });
    await expect(getAdminSettlingProgramme()).resolves.toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
