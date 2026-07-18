import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherSectionId } from '../outcomes/api';

export async function oneTapAttendance(
  day: string,
  marks: Array<{ childId: string; status: string }>,
) {
  return apiFetch(`/attendance/${getTeacherSectionId()}/one-tap`, {
    method: 'POST',
    body: { day, marks },
  });
}
