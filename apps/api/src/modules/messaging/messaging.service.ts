import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { AttendanceService } from '../attendance/attendance.service';
import { classifyMessageIntent, faqAutoReply, type IntentRoute } from './intent-classifier';

@Injectable()
export class MessagingRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async insert(row: {
    school_id: string;
    child_id: string;
    guardian_id: string | null;
    thread_id: string;
    direction: 'inbound' | 'outbound';
    channel: string;
    intent_route: IntentRoute;
    content_ref: string;
    draft_reply: string | null;
    approval_status: string;
  }) {
    const { data, error } = await this.client()
      .from('message_log')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client()
      .from('message_log')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async approveDraft(id: string, outboundContent: string) {
    const { data, error } = await this.client()
      .from('message_log')
      .update({
        approval_status: 'approved',
        draft_reply: outboundContent,
      })
      .eq('id', id)
      .eq('approval_status', 'draft')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async insertOutbound(row: {
    school_id: string;
    child_id: string;
    guardian_id: string | null;
    thread_id: string;
    content_ref: string;
    intent_route: IntentRoute;
    approval_status: string;
  }) {
    return this.insert({
      ...row,
      direction: 'outbound',
      channel: 'whatsapp',
      draft_reply: null,
    });
  }

  async listThread(threadId: string) {
    const { data, error } = await this.client()
      .from('message_log')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async listAdminQueue(schoolId: string) {
    const { data, error } = await this.client()
      .from('message_log')
      .select('*')
      .eq('school_id', schoolId)
      .eq('intent_route', 'admin')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async listTeacherDrafts(schoolId: string) {
    const { data, error } = await this.client()
      .from('message_log')
      .select('*')
      .eq('school_id', schoolId)
      .eq('intent_route', 'teacher_queue')
      .eq('approval_status', 'draft')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async findChildSchool(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, section_id, sections(school_id)')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly repository: MessagingRepository,
    private readonly attendance: AttendanceService,
    private readonly ai: AiOrchestrationService,
  ) {}

  async handleInbound(input: {
    childId: string;
    guardianId?: string | null;
    text: string;
    bandId: string;
    day?: string;
  }) {
    const child = await this.repository.findChildSchool(input.childId);
    if (!child) throw new NotFoundException('Child not found');
    const sections = child.sections as { school_id: string } | { school_id: string }[] | null;
    const schoolId = Array.isArray(sections)
      ? sections[0]?.school_id
      : sections?.school_id;
    if (!schoolId) throw new BadRequestException('Child school unresolved');

    const intent = classifyMessageIntent(input.text);
    const threadId = `child:${input.childId}`;

    if (intent === 'attendance') {
      const sectionId = child.section_id as string;
      await this.attendance.oneTapMark(
        sectionId,
        input.day ?? new Date().toISOString().slice(0, 10),
        [{ childId: input.childId, status: 'absent' }],
        null,
      );
      const row = await this.repository.insert({
        school_id: schoolId,
        child_id: input.childId,
        guardian_id: input.guardianId ?? null,
        thread_id: threadId,
        direction: 'inbound',
        channel: 'whatsapp',
        intent_route: 'attendance',
        content_ref: input.text,
        draft_reply: null,
        approval_status: 'auto',
      });
      return mapMessage(row);
    }

    if (intent === 'faq') {
      const reply = faqAutoReply(input.text);
      await this.repository.insert({
        school_id: schoolId,
        child_id: input.childId,
        guardian_id: input.guardianId ?? null,
        thread_id: threadId,
        direction: 'inbound',
        channel: 'whatsapp',
        intent_route: 'faq',
        content_ref: input.text,
        draft_reply: null,
        approval_status: 'auto',
      });
      const outbound = await this.repository.insertOutbound({
        school_id: schoolId,
        child_id: input.childId,
        guardian_id: input.guardianId ?? null,
        thread_id: threadId,
        content_ref: reply,
        intent_route: 'faq',
        approval_status: 'auto',
      });
      return mapMessage(outbound);
    }

    if (intent === 'admin') {
      const row = await this.repository.insert({
        school_id: schoolId,
        child_id: input.childId,
        guardian_id: input.guardianId ?? null,
        thread_id: threadId,
        direction: 'inbound',
        channel: 'whatsapp',
        intent_route: 'admin',
        content_ref: input.text,
        draft_reply: null,
        approval_status: 'sent',
      });
      return mapMessage(row);
    }

    const draft = await this.ai.orchestrate({
      featureId: 'parent_reply_draft',
      bandId: input.bandId,
      variables: { guardian_message: input.text },
    });
    const row = await this.repository.insert({
      school_id: schoolId,
      child_id: input.childId,
      guardian_id: input.guardianId ?? null,
      thread_id: threadId,
      direction: 'inbound',
      channel: 'whatsapp',
      intent_route: 'teacher_queue',
      content_ref: input.text,
      draft_reply: draft.text,
      approval_status: 'draft',
    });
    return mapMessage(row);
  }

  /** Approve never calls AI — sends the existing draft only. */
  async approveDraft(messageId: string) {
    const existing = await this.repository.findById(messageId);
    if (!existing) throw new NotFoundException('Message not found');
    if (existing.approval_status !== 'draft') {
      throw new BadRequestException('Only draft messages can be approved');
    }
    const replyText = (existing.draft_reply as string) ?? '';
    const approved = await this.repository.approveDraft(messageId, replyText);
    await this.repository.insertOutbound({
      school_id: existing.school_id as string,
      child_id: existing.child_id as string,
      guardian_id: (existing.guardian_id as string | null) ?? null,
      thread_id: existing.thread_id as string,
      content_ref: replyText,
      intent_route: 'teacher_queue',
      approval_status: 'sent',
    });
    return mapMessage(approved);
  }

  async getThread(threadId: string) {
    const rows = await this.repository.listThread(threadId);
    return rows.map(mapMessage);
  }

  async getAdminQueue(schoolId: string) {
    const rows = await this.repository.listAdminQueue(schoolId);
    return rows.map(mapMessage);
  }

  async getTeacherDrafts(schoolId: string) {
    const rows = await this.repository.listTeacherDrafts(schoolId);
    return rows.map(mapMessage);
  }
}

function mapMessage(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    childId: row.child_id as string,
    threadId: row.thread_id as string,
    direction: row.direction as string,
    intentRoute: row.intent_route as string,
    contentRef: row.content_ref as string,
    draftReply: (row.draft_reply as string | null) ?? null,
    approvalStatus: row.approval_status as string,
    createdAt: row.created_at as string | undefined,
  };
}
