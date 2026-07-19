import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import { AuditService } from './audit.service';

function createThenableResult<T>(result: T) {
  const builder = {
    insert: vi.fn(() => builder),
    then: undefined as unknown,
  };
  builder.then = (
    resolve: (value: T) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('AuditService', () => {
  let service: AuditService;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    from = vi.fn();
    service = new AuditService({
      getClient: () => ({ from }),
    } as unknown as SupabaseService);
  });

  it('appends an audit_log row with default empty scope', async () => {
    const insert = vi.fn(() =>
      createThenableResult({ error: null }),
    );
    from.mockImplementation(() => ({ insert }));

    await service.append({
      actorIdentityId: 'id-1',
      action: 'platform.support_session.access',
      justificationRef: 'sess-1',
    });

    expect(from).toHaveBeenCalledWith('audit_log');
    expect(insert).toHaveBeenCalledWith({
      actor_identity_id: 'id-1',
      action: 'platform.support_session.access',
      scope: {},
      justification_ref: 'sess-1',
    });
  });

  it('rejects when insert fails', async () => {
    from.mockImplementation(() => ({
      insert: vi.fn(() =>
        createThenableResult({ error: { message: 'rls denied' } }),
      ),
    }));

    await expect(
      service.append({
        actorIdentityId: 'id-1',
        action: 'test',
        scope: { schoolId: 'school-1' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when database is not configured', async () => {
    service = new AuditService({
      getClient: () => null,
    } as unknown as SupabaseService);
    await expect(
      service.append({ actorIdentityId: 'id-1', action: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
