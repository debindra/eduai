import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TeacherNav from './TeacherNav.svelte';
import { clearSession, setSession } from '../../lib/shared/stores/session';
import {
  clearTeacherContext,
  teacherContext,
} from '../../lib/shared/stores/teacher-context';

const push = vi.fn();

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/utils', () => ({
  push: (...args: unknown[]) => push(...args),
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

const classAssignment = {
  sectionId: 'sec-ukg',
  sectionName: 'UKG A',
  grade: 'UKG',
  bandId: 'band-pp',
  assessmentMode: 'three_state_narrative',
  subjectId: null as string | null,
  subjectName: null as string | null,
  isClassTeacher: true,
};

const subjectAssignment = {
  sectionId: 'sec-g1',
  sectionName: 'Grade 1 A',
  grade: 'Grade 1',
  bandId: 'band-early',
  assessmentMode: 'four_point_scale',
  subjectId: 'math',
  subjectName: 'Mathematics',
  isClassTeacher: false,
};

function setContext(selected: typeof classAssignment | typeof subjectAssignment) {
  teacherContext.set({
    teacherId: 't1',
    assignments: [classAssignment, subjectAssignment],
    selected,
  });
}

describe('TeacherNav', () => {
  beforeEach(() => {
    clearSession();
    clearTeacherContext();
    push.mockClear();
    window.history.pushState({}, '', '/teacher/calendar');
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

  it('shows class-teacher links and hides Subject for class grain', () => {
    setContext(classAssignment);
    render(TeacherNav);

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute(
      'href',
      '/teacher/calendar',
    );
    expect(screen.getByRole('link', { name: 'Attendance' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Oversight' })).toHaveAttribute(
      'href',
      '/teacher/oversight',
    );
    expect(screen.queryByRole('link', { name: 'Subject' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sweep' })).toHaveAttribute('href', '/teacher/sweep');
    expect(screen.getByRole('link', { name: 'Remedial' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage' })).toBeInTheDocument();
  });

  it('shows Subject and hides class-teacher links for subject grain', () => {
    setContext(subjectAssignment);
    render(TeacherNav);

    expect(screen.getByRole('link', { name: 'Subject' })).toHaveAttribute(
      'href',
      '/teacher/subject',
    );
    expect(screen.queryByRole('link', { name: 'Oversight' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
  });

  it('updates visible links when switching assignment', async () => {
    setContext(classAssignment);
    const user = userEvent.setup();
    render(TeacherNav);

    expect(screen.getByRole('link', { name: 'Oversight' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Subject' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Section and subject'), 'sec-g1::math');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Subject' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Oversight' })).not.toBeInTheDocument();
  });

  it('redirects to calendar when leaving a grain-gated page', async () => {
    setContext(classAssignment);
    window.history.pushState({}, '', '/teacher/oversight');
    const user = userEvent.setup();
    render(TeacherNav);

    await user.selectOptions(screen.getByLabelText('Section and subject'), 'sec-g1::math');

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/teacher/calendar');
    });
  });

  it('renders a section/subject switcher from teacher context', async () => {
    setContext(classAssignment);

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
