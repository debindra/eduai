import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ExitRepository, ExitService } from './exit.service';
import type { DocgenClient } from '../../shared/docgen-client';

describe('ExitService', () => {
  let service: ExitService;
  let repository: {
    findChild: ReturnType<typeof vi.fn>;
    findSchool: ReturnType<typeof vi.fn>;
    initiateExit: ReturnType<typeof vi.fn>;
    listSchoolsPastDeletion: ReturnType<typeof vi.fn>;
    markDeleted: ReturnType<typeof vi.fn>;
  };
  let docgen: { renderLeavingPack: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findChild: vi.fn().mockResolvedValue({ id: 'c1', section_id: 's1', name: 'Priya' }),
      findSchool: vi.fn().mockResolvedValue({ id: 'school-1', exit_status: null }),
      initiateExit: vi.fn().mockResolvedValue({
        id: 'school-1',
        exit_status: 'pending_deletion',
        exit_requested_at: '2025-06-01T00:00:00Z',
        deletion_scheduled_at: '2025-08-30T00:00:00Z',
      }),
      listSchoolsPastDeletion: vi.fn(),
      markDeleted: vi.fn(),
    };
    docgen = {
      renderLeavingPack: vi.fn().mockResolvedValue({
        documentRenderId: 'dr-1',
        sourceRowHash: 'abc',
        storageRef: 'file://x',
        templateType: 'leaving_pack',
      }),
    };
    const config = { get: vi.fn().mockReturnValue('http://localhost:3002') } as unknown as ConfigService;
    service = new ExitService(repository as unknown as ExitRepository, config);
    service.setDocgenClient(docgen as unknown as DocgenClient);
  });

  it('leaving pack calls DocGen without duplicating render logic', async () => {
    const result = await service.createLeavingPack('c1');
    expect(docgen.renderLeavingPack).toHaveBeenCalledWith('c1');
    expect(result.templateType).toBe('leaving_pack');
  });

  it('deletion sweep only deletes past-window pending schools', async () => {
    repository.listSchoolsPastDeletion.mockResolvedValue([
      { id: 'school-old', exit_status: 'pending_deletion' },
    ]);
    repository.markDeleted.mockResolvedValue({ id: 'school-old', exit_status: 'deleted' });
    const result = await service.runDeletionSweep(new Date('2025-09-01'));
    expect(result.deletedCount).toBe(1);
    expect(repository.listSchoolsPastDeletion).toHaveBeenCalled();
  });

  it('does not delete active schools (empty past-window list)', async () => {
    repository.listSchoolsPastDeletion.mockResolvedValue([]);
    const result = await service.runDeletionSweep();
    expect(result.deletedCount).toBe(0);
    expect(repository.markDeleted).not.toHaveBeenCalled();
  });
});
