import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutcomesRepository, OutcomesService } from './outcomes.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';

describe('OutcomesService Propose/Confirm', () => {
  let service: OutcomesService;
  let repository: {
    insertProposed: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    supabase: {
      getClient: ReturnType<typeof vi.fn>;
    };
  };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };
  let mockClient: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnThis(),
    };
    repository = {
      insertProposed: vi.fn(),
      findById: vi.fn(),
      confirm: vi.fn(),
      listChildren: vi.fn(),
      supabase: {
        getClient: vi.fn().mockReturnValue(mockClient),
      },
    };
    ai = { orchestrate: vi.fn() };
    service = new OutcomesService(
      repository as unknown as OutcomesRepository,
      ai as unknown as AiOrchestrationService,
    );
    
    // Default mock for child validation
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'children') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'c1' }, error: null }),
        };
      }
      if (table === 'teacher_sections') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'ts1' }, error: null }),
        };
      }
      return mockClient;
    });
  });

  it('propose batch never writes confirmed state', async () => {
    repository.insertProposed.mockResolvedValue({
      id: 'p1',
      child_id: 'c1',
      outcome_id: 'o1',
      section_id: 's1',
      subject_id: 'subj1',
      rating_code: 'emerging',
      state: 'proposed',
      evidence_note: null,
    });
    await service.proposeBatchSweep(
      's1',
      'subj1',
      [{ childId: 'c1', outcomeId: 'o1', ratingCode: 'emerging' }],
      't1',
    );
    expect(repository.insertProposed).toHaveBeenCalledWith(
      expect.objectContaining({ rating_code: 'emerging', subject_id: 'subj1' }),
    );
    expect(repository.confirm).not.toHaveBeenCalled();
  });

  it('confirm never calls AI', async () => {
    repository.findById.mockResolvedValue({
      id: 'p1',
      state: 'proposed',
      section_id: 's1',
      subject_id: 'subj1',
    });
    repository.confirm.mockResolvedValue({
      id: 'p1',
      child_id: 'c1',
      outcome_id: 'o1',
      section_id: 's1',
      subject_id: 'subj1',
      rating_code: 'emerging',
      state: 'confirmed',
      evidence_note: null,
    });
    await service.confirmOutcome('p1', 't1');
    expect(ai.orchestrate).not.toHaveBeenCalled();
    expect(repository.confirm).toHaveBeenCalled();
  });

  it('rejects top-band batch sweep', async () => {
    await expect(
      service.proposeBatchSweep(
        's1',
        null,
        [{ childId: 'c1', outcomeId: 'o1', ratingCode: 'secure' }],
        't1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('observation routes absence to attendance without insert', async () => {
    repository.listChildren.mockResolvedValue([
      { id: 'c1', name: 'Priya', rollNumber: '1' },
    ]);
    const result = await service.proposeFromObservation(
      's1',
      null,
      'band-1',
      'absent today',
      'o1',
      't1',
    );
    expect(result.kind).toBe('attendance');
    expect(repository.insertProposed).not.toHaveBeenCalled();
  });
  
  it('rejects top-band edit on confirm', async () => {
    repository.findById.mockResolvedValue({
      id: 'p1',
      state: 'proposed',
      section_id: 's1',
      subject_id: null,
    });
    await expect(
      service.confirmOutcome('p1', 't1', { ratingCode: '4' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('OutcomesService getSweepContext', () => {
  let service: OutcomesService;
  let repository: {
    findSectionBandId: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    listOutcomesForBand: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findSectionBandId: vi.fn(),
      listChildren: vi.fn(),
      listOutcomesForBand: vi.fn(),
    };
    service = new OutcomesService(
      repository as unknown as OutcomesRepository,
      { orchestrate: vi.fn() } as unknown as AiOrchestrationService,
    );
  });

  it('returns active children and band-derived outcomes (no rating sort)', async () => {
    repository.findSectionBandId.mockResolvedValue('band-pp');
    repository.listChildren.mockResolvedValue([
      { id: 'c2', name: 'Priya', rollNumber: '2' },
      { id: 'c1', name: 'Aarav', rollNumber: '1' },
    ]);
    repository.listOutcomesForBand.mockResolvedValue([
      { id: 'o1', code: 'PP-SELF-001', statement_en: 'Shows awareness of self' },
    ]);

    const result = await service.getSweepContext('sec-1', null);

    expect(repository.listOutcomesForBand).toHaveBeenCalledWith('band-pp', null);
    expect(result).toEqual({
      sectionId: 'sec-1',
      bandId: 'band-pp',
      subjectId: null,
      children: [
        { childId: 'c1', name: 'Aarav', rollNumber: '1' },
        { childId: 'c2', name: 'Priya', rollNumber: '2' },
      ],
      outcomes: [
        { outcomeId: 'o1', code: 'PP-SELF-001', statement: 'Shows awareness of self' },
      ],
    });
  });

  it('passes subjectId through to outcome filter', async () => {
    repository.findSectionBandId.mockResolvedValue('band-early');
    repository.listChildren.mockResolvedValue([]);
    repository.listOutcomesForBand.mockResolvedValue([]);

    await service.getSweepContext('sec-g1', 'subj-math');
    expect(repository.listOutcomesForBand).toHaveBeenCalledWith('band-early', 'subj-math');
  });
});
