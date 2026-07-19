import { apiFetch } from '../../lib/shared/api/client';
import { requireSectionId } from '../../lib/shared/stores/teacher-context';

export type AttendanceChild = {
  id: string;
  name: string;
  rollNumber: string;
};

export async function listAttendanceChildren(day: string) {
  const result = await apiFetch<{
    sectionId: string;
    day: string;
    children: Array<{ id: string; name: string; roll_number?: string; rollNumber?: string }>;
  }>(`/attendance/${requireSectionId()}?day=${encodeURIComponent(day)}`);

  return {
    sectionId: result.sectionId,
    day: result.day,
    children: result.children.map((c) => ({
      id: c.id,
      name: c.name,
      rollNumber: c.rollNumber ?? c.roll_number ?? '',
    })),
  };
}

/** Section roster for report/child pickers — same payload as attendance day list. */
export async function listSectionChildren() {
  return listAttendanceChildren(new Date().toISOString().slice(0, 10));
}

export async function oneTapAttendance(
  day: string,
  marks: Array<{ childId: string; status: string }>,
) {
  return apiFetch(`/attendance/${requireSectionId()}/one-tap`, {
    method: 'POST',
    body: { day, marks },
  });
}
