import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TeacherNav from './TeacherNav.svelte';
import { clearSession, setSession } from '../../lib/shared/stores/session';
import {
  clearTeacherContext,
  teacherContext,
} from '../../lib/shared/stores/teacher-context';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/utils', () => ({
  push: vi.fn(),
}));

vi.mock('../../lib/shared/stores/teacher-context', async () => {
  const actual = await vi.importActual<
    typeof import('../../lib/shared/stores/teacher-context')
  >('../../lib/shared/stores/teacher-context');
  return {
    ...actual,
    loadTeacherContext: vi.fn().mockResolvedValue(null),
  };
});

describe('TeacherNav', () => {
  beforeEach(() => {
    clearSession();
    clearTeacherContext();
    setSession({
      accessToken: 't',
      identity: {
        id: 'i1',
        email: 'teacher@schoolx.dev',
        phone: null,
        displayName: 'UKG Teacher',
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });
  });

  it('links to all teacher Phase 1–3 routes', () => {
    render(TeacherNav);
    expect(screen.getByRole('link', { name: 'Attendance' })).toHaveAttribute(
      'href',
      '/teacher/attendance',
    );
    expect(screen.getByRole('link', { name: 'Sweep' })).toHaveAttribute('href', '/teacher/sweep');
    expect(screen.getByRole('link', { name: 'Weekly' })).toHaveAttribute('href', '/teacher/weekly');
    expect(screen.getByRole('link', { name: 'Lesson' })).toHaveAttribute('href', '/teacher/lesson');
    expect(screen.getByRole('link', { name: 'Pacing' })).toHaveAttribute('href', '/teacher/pacing');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/teacher/reports');
    expect(screen.getByRole('link', { name: 'Subject' })).toHaveAttribute('href', '/teacher/subject');
    expect(screen.getByRole('link', { name: 'Oversight' })).toHaveAttribute(
      'href',
      '/teacher/oversight',
    );
    expect(screen.getByRole('link', { name: 'Remedial' })).toHaveAttribute(
      'href',
      '/teacher/remedial',
    );
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/teacher/messaging');
    expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/teacher/manage');
  });

  it('renders a section/subject switcher from teacher context', async () => {
    teacherContext.set({
      teacherId: 't1',
      assignments: [
        {
          sectionId: 'sec-ukg',
          sectionName: 'UKG A',
          grade: 'UKG',
          bandId: 'band-pp',
          assessmentMode: 'three_state_narrative',
          subjectId: null,
          subjectName: null,
          isClassTeacher: true,
        },
        {
          sectionId: 'sec-g1',
          sectionName: 'Grade 1 A',
          grade: 'Grade 1',
          bandId: 'band-early',
          assessmentMode: 'four_point_scale',
          subjectId: 'math',
          subjectName: 'Mathematics',
          isClassTeacher: false,
        },
      ],
      selected: {
        sectionId: 'sec-ukg',
        sectionName: 'UKG A',
        grade: 'UKG',
        bandId: 'band-pp',
        assessmentMode: 'three_state_narrative',
        subjectId: null,
        subjectName: null,
        isClassTeacher: true,
      },
    });

    const user = userEvent.setup();
    render(TeacherNav);

    const select = screen.getByLabelText('Section and subject');
    expect(select).toBeInTheDocument();
    await user.selectOptions(select, 'sec-g1::math');

    await waitFor(() => {
      expect(teacherContext).toBeTruthy();
    });
    let selectedSection: string | null = null;
    const unsub = teacherContext.subscribe((ctx) => {
      selectedSection = ctx?.selected?.sectionId ?? null;
    });
    unsub();
    expect(selectedSection).toBe('sec-g1');
  });
});
