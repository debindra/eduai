import { Inject, Injectable } from '@nestjs/common';
import {
  MESSAGING_PROVIDER_PORT,
  type MessagingProviderPort,
} from '../../shared/ports/messaging-provider.port';
import { SupabaseService } from '../../database/supabase.service';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

@Injectable()
export class AttendanceRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listChildren(sectionId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active');
    if (error) throw error;
    return data ?? [];
  }

  async upsertAttendance(rows: Array<{
    child_id: string;
    section_id: string;
    day: string;
    status: AttendanceStatus;
    recorded_by: string | null;
  }>) {
    const { data, error } = await this.client()
      .from('attendance_record')
      .upsert(rows, { onConflict: 'child_id,day' })
      .select('*');
    if (error) throw error;
    return data ?? [];
  }

  async listGuardianPhones(childIds: string[]) {
    if (childIds.length === 0) return [];
    const { data, error } = await this.client()
      .from('guardian_child_links')
      .select('child_id, guardians(id, membership_id, school_memberships(identity_id, identities(phone)))')
      .in('child_id', childIds);
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository,
    @Inject(MESSAGING_PROVIDER_PORT) private readonly messaging: MessagingProviderPort,
  ) {}

  async oneTapMark(
    sectionId: string,
    day: string,
    marks: Array<{ childId: string; status: AttendanceStatus }>,
    teacherId: string | null,
  ) {
    const rows = marks.map((m) => ({
      child_id: m.childId,
      section_id: sectionId,
      day,
      status: m.status,
      recorded_by: teacherId,
    }));
    const saved = await this.repository.upsertAttendance(rows);

    const children = await this.repository.listChildren(sectionId);
    const nameById = new Map(children.map((c) => [c.id as string, c.name as string]));

    const links = await this.repository.listGuardianPhones(marks.map((m) => m.childId));
    for (const mark of marks) {
      const childLinks = links.filter((l) => l.child_id === mark.childId);
      for (const link of childLinks) {
        const phone = extractPhone(link);
        if (!phone) continue;
        await this.messaging.sendAttendanceConfirmation(
          phone,
          nameById.get(mark.childId) ?? 'your child',
          mark.status,
          day,
          'whatsapp',
        );
      }
    }

    return {
      sectionId,
      day,
      records: saved.map((r) => ({
        id: r.id as string,
        childId: r.child_id as string,
        status: r.status as AttendanceStatus,
      })),
    };
  }

  async listForDay(sectionId: string, day: string) {
    const children = await this.repository.listChildren(sectionId);
    return { sectionId, day, children };
  }
}

function extractPhone(link: Record<string, unknown>): string | null {
  const guardians = link.guardians as Record<string, unknown> | null;
  if (!guardians) return null;
  const membership = guardians.school_memberships as Record<string, unknown> | null;
  if (!membership) return null;
  const identity = membership.identities as Record<string, unknown> | null;
  return (identity?.phone as string | null) ?? null;
}
