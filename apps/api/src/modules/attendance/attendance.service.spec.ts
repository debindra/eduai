import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceRepository, AttendanceService } from './attendance.service';
import type { MessagingProviderPort } from '../../shared/ports/messaging-provider.port';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let repository: {
    upsertAttendance: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    listGuardianPhones: ReturnType<typeof vi.fn>;
  };
  let messaging: { sendAttendanceConfirmation: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      upsertAttendance: vi.fn(),
      listChildren: vi.fn(),
      listGuardianPhones: vi.fn(),
    };
    messaging = { sendAttendanceConfirmation: vi.fn() };
    service = new AttendanceService(
      repository as unknown as AttendanceRepository,
      messaging as unknown as MessagingProviderPort,
    );
  });

  it('upserts attendance and pings guardians once per mark', async () => {
    repository.upsertAttendance.mockResolvedValue([
      { id: 'a1', child_id: 'c1', status: 'present' },
    ]);
    repository.listChildren.mockResolvedValue([{ id: 'c1', name: 'Aarav' }]);
    repository.listGuardianPhones.mockResolvedValue([
      {
        child_id: 'c1',
        guardians: {
          school_memberships: { identities: { phone: '9800000001' } },
        },
      },
    ]);

    await service.oneTapMark(
      'sec-1',
      '2025-04-15',
      [{ childId: 'c1', status: 'present' }],
      'teacher-1',
    );

    expect(repository.upsertAttendance).toHaveBeenCalledTimes(1);
    expect(messaging.sendAttendanceConfirmation).toHaveBeenCalledWith(
      '9800000001',
      'Aarav',
      'present',
      '2025-04-15',
      'whatsapp',
    );
  });

  it('is idempotent on re-tap (upsert)', async () => {
    repository.upsertAttendance.mockResolvedValue([]);
    repository.listChildren.mockResolvedValue([]);
    repository.listGuardianPhones.mockResolvedValue([]);
    await service.oneTapMark('sec-1', '2025-04-15', [], null);
    await service.oneTapMark('sec-1', '2025-04-15', [], null);
    expect(repository.upsertAttendance).toHaveBeenCalledTimes(2);
  });
});
