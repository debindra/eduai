import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagingRepository, MessagingService } from './messaging.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import type { AttendanceService } from '../attendance/attendance.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let repository: {
    findChildSchool: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    insertOutbound: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    approveDraft: ReturnType<typeof vi.fn>;
  };
  let attendance: { oneTapMark: ReturnType<typeof vi.fn> };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findChildSchool: vi.fn().mockResolvedValue({
        id: 'c1',
        section_id: 's1',
        sections: { school_id: 'school-1' },
      }),
      insert: vi.fn().mockImplementation(async (row) => ({
        id: 'm1',
        ...row,
        created_at: '2025-04-15T00:00:00Z',
      })),
      insertOutbound: vi.fn().mockImplementation(async (row) => ({
        id: 'm2',
        direction: 'outbound',
        ...row,
      })),
      findById: vi.fn(),
      approveDraft: vi.fn(),
    };
    attendance = { oneTapMark: vi.fn().mockResolvedValue([]) };
    ai = { orchestrate: vi.fn().mockResolvedValue({ text: 'Draft reply' }) };
    service = new MessagingService(
      repository as unknown as MessagingRepository,
      attendance as unknown as AttendanceService,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('routes attendance before teacher queue', async () => {
    await service.handleInbound({
      childId: 'c1',
      text: 'Priya is absent today',
      bandId: 'b1',
    });
    expect(attendance.oneTapMark).toHaveBeenCalled();
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });

  it('approve never calls AI', async () => {
    repository.findById.mockResolvedValue({
      id: 'm1',
      approval_status: 'draft',
      draft_reply: 'Existing draft',
      school_id: 'school-1',
      child_id: 'c1',
      guardian_id: null,
      thread_id: 'child:c1',
    });
    repository.approveDraft.mockResolvedValue({
      id: 'm1',
      approval_status: 'approved',
      draft_reply: 'Existing draft',
      school_id: 'school-1',
      child_id: 'c1',
      thread_id: 'child:c1',
      direction: 'inbound',
      intent_route: 'teacher_queue',
      content_ref: 'hello',
    });
    await service.approveDraft('m1');
    expect(ai.orchestrate).not.toHaveBeenCalled();
    expect(repository.insertOutbound).toHaveBeenCalledWith(
      expect.objectContaining({ content_ref: 'Existing draft' }),
    );
  });
});
