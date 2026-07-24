import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RatingsRepository, RatingsService } from './ratings.service';

describe('RatingsService', () => {
  let service: RatingsService;
  let repo: {
    findIndicator: ReturnType<typeof vi.fn>;
    insertProposed: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    insertCorrection: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repo = {
      findIndicator: vi.fn().mockResolvedValue({ id: 'ind1', code: 'ENG4.U1.1' }),
      insertProposed: vi.fn().mockResolvedValue({ id: 'r1', state: 'proposed', rating: 2 }),
      findById: vi.fn().mockResolvedValue({ id: 'r1', state: 'proposed' }),
      confirm: vi.fn().mockResolvedValue({ id: 'r1', state: 'confirmed', rating: 2 }),
      insertCorrection: vi.fn().mockResolvedValue({ id: 'r2', state: 'proposed', rating: 3 }),
    };
    service = new RatingsService(repo as unknown as RatingsRepository);
  });

  it('proposes a 1–4 rating on an indicator', async () => {
    const row = await service.propose({
      childId: 'c1',
      indicatorId: 'ind1',
      rating: 2,
      captureMode: 'batch_sweep',
    });
    expect(row.state).toBe('proposed');
    expect(repo.insertProposed).toHaveBeenCalledWith(
      expect.objectContaining({
        child_id: 'c1',
        indicator_id: 'ind1',
        rating: 2,
        capture_mode: 'batch_sweep',
      }),
    );
  });

  it('rejects rating outside 1–4 (I2)', async () => {
    await expect(
      service.propose({ childId: 'c1', indicatorId: 'ind1', rating: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks top rating 4 on propose (mapper guard)', async () => {
    await expect(
      service.propose({ childId: 'c1', indicatorId: 'ind1', rating: 4 }),
    ).rejects.toThrow(/top rating/);
  });

  it('confirm never invents a new rating value — confirms proposed row', async () => {
    const row = await service.confirm('r1', 'identity-1');
    expect(row.state).toBe('confirmed');
    expect(repo.confirm).toHaveBeenCalledWith('r1', 'identity-1');
  });

  it('proposeBatch proposes each item', async () => {
    await service.proposeBatch(
      [
        { childId: 'c1', indicatorId: 'ind1', rating: 2 },
        { childId: 'c2', indicatorId: 'ind1', rating: 3 },
      ],
      'author-1',
    );
    expect(repo.insertProposed).toHaveBeenCalledTimes(2);
  });
});
