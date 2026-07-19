import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import AttendancePage from './AttendancePage.svelte';
import { teacherContext } from '../../lib/shared/stores/teacher-context';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/utils', () => ({
  push: vi.fn(),
}));

vi.mock('./api', () => ({
  listAttendanceChildren: vi.fn(),
  oneTapAttendance: vi.fn(),
}));

import { listAttendanceChildren, oneTapAttendance } from './api';

const mockList = vi.mocked(listAttendanceChildren);
const mockOneTap = vi.mocked(oneTapAttendance);

const children = [
  { id: 'c1', name: 'Aarav Sharma', rollNumber: '1' },
  { id: 'c2', name: 'Priya Thapa', rollNumber: '2' },
  { id: 'c3', name: 'Kabir Gurung', rollNumber: '3' },
];

describe('AttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teacherContext.set({
      teacherId: 't1',
      assignments: [
        {
          sectionId: 'sec-1',
          sectionName: 'UKG A',
          grade: 'UKG',
          bandId: 'band-pp',
          assessmentMode: 'three_state_narrative',
          subjectId: null,
          subjectName: null,
          isClassTeacher: true,
        },
      ],
      selected: {
        sectionId: 'sec-1',
        sectionName: 'UKG A',
        grade: 'UKG',
        bandId: 'band-pp',
        assessmentMode: 'three_state_narrative',
        subjectId: null,
        subjectName: null,
        isClassTeacher: true,
      },
    });
    mockList.mockResolvedValue({ sectionId: 'sec-1', day: '2026-07-19', children });
  });

  it('loads children from the API and saves default present status', async () => {
    mockOneTap.mockResolvedValue({});
    const user = userEvent.setup();

    render(AttendancePage);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Aarav Sharma/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => expect(mockOneTap).toHaveBeenCalledTimes(1));
    const [, marks] = mockOneTap.mock.calls[0];
    expect(marks).toHaveLength(3);
    expect(marks.every((mark) => mark.status === 'present')).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/attendance saved/i)).toBeInTheDocument();
    });
  });

  it('submits a changed status for a specific child', async () => {
    mockOneTap.mockResolvedValue({});
    const user = userEvent.setup();

    render(AttendancePage);
    await waitFor(() => expect(screen.getByLabelText('Status Priya Thapa')).toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText('Status Priya Thapa'), 'absent');
    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => expect(mockOneTap).toHaveBeenCalledTimes(1));
    const [, marks] = mockOneTap.mock.calls[0];
    const priya = marks.find((mark) => mark.childId === 'c2');
    expect(priya?.status).toBe('absent');
  });

  it('shows an error message when saving fails', async () => {
    mockOneTap.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    render(AttendancePage);
    await waitFor(() => expect(screen.getByRole('button', { name: /save attendance/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });
});
