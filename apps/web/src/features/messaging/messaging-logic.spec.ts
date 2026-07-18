import { describe, expect, it } from 'vitest';
import { isDraftPending, queueLabel } from './messaging-logic';

describe('messaging-logic', () => {
  it('detects pending drafts', () => {
    expect(
      isDraftPending({
        id: '1',
        threadId: 't',
        direction: 'inbound',
        intentRoute: 'teacher_queue',
        contentRef: 'hi',
        draftReply: 'hello',
        approvalStatus: 'draft',
      }),
    ).toBe(true);
  });

  it('labels queues', () => {
    expect(queueLabel('admin')).toBe('Admin queue');
    expect(queueLabel('teacher_queue')).toBe('Teacher queue');
  });
});
