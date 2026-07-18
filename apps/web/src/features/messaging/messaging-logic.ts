export interface MessageRow {
  id: string;
  threadId: string;
  direction: string;
  intentRoute: string;
  contentRef: string;
  draftReply: string | null;
  approvalStatus: string;
}

export function isDraftPending(msg: MessageRow): boolean {
  return msg.approvalStatus === 'draft' && Boolean(msg.draftReply);
}

export function queueLabel(intentRoute: string): string {
  if (intentRoute === 'admin') return 'Admin queue';
  if (intentRoute === 'teacher_queue') return 'Teacher queue';
  return intentRoute;
}
