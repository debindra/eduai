import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../lib/shared/stores/session';

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

vi.mock('./api', () => ({
  getCalendarView: vi.fn(),
}));

import TeacherCalendarPage from './TeacherCalendarPage.svelte';
import { getCalendarView } from './api';

const mockGetCalendarView = vi.mocked(getCalendarView);

describe('TeacherCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    setSession({
      accessToken: 't',
      identity: {
        id: 'i1',
        email: 'teacher@schoolx.dev',
        phone: null,
        displayName: 'Teacher',
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });
  });

  it('shows view-only calendar board when school calendar exists', async () => {
    mockGetCalendarView.mockResolvedValue({
      schoolId: 'school-1',
      approvalStatus: 'approved',
      academicYearLabel: '2082/83',
      bsYear: 2082,
      sessionStart: '2025-04-14',
      sessionEnd: '2026-04-13',
      weeklyOffs: [6, 7],
      nationalClosures: [
        {
          id: 'n1',
          name: 'Dashain',
          startDate: '2025-10-02',
          endDate: '2025-10-12',
          source: 'national',
        },
      ],
      closures: [],
      terminals: [],
    });

    render(TeacherCalendarPage);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-board')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: '2082/83 Academic Calendar', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dashain')).toBeInTheDocument();
    expect(screen.getByText(/Weekly offs \(Sat, Sun\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Same calendar as your school/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/View only/i)).not.toBeInTheDocument();
  });

  it('shows empty state when no calendar', async () => {
    mockGetCalendarView.mockResolvedValue({
      schoolId: 'school-1',
      approvalStatus: 'none',
      nationalClosures: [],
      closures: [],
      terminals: [],
    });

    render(TeacherCalendarPage);

    await waitFor(() => {
      expect(screen.getByText(/No school calendar has been set up/i)).toBeInTheDocument();
    });
  });
});
