import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import AttendancePage from './AttendancePage.svelte';

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
  oneTapAttendance: vi.fn(),
}));

import { oneTapAttendance } from './api';

const mockOneTapAttendance = vi.mocked(oneTapAttendance);

describe('AttendancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves attendance with default present status for every child', async () => {
    mockOneTapAttendance.mockResolvedValue({});
    const user = userEvent.setup();

    render(AttendancePage);

    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => expect(mockOneTapAttendance).toHaveBeenCalledTimes(1));
    const [, marks] = mockOneTapAttendance.mock.calls[0];
    expect(marks).toHaveLength(3);
    expect(marks.every((mark) => mark.status === 'present')).toBe(true);

    await waitFor(() => {
      expect(screen.getByText(/attendance saved/i)).toBeInTheDocument();
    });
  });

  it('submits a changed status for a specific child', async () => {
    mockOneTapAttendance.mockResolvedValue({});
    const user = userEvent.setup();

    render(AttendancePage);

    await user.selectOptions(screen.getByLabelText('Status Priya Thapa'), 'absent');
    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => expect(mockOneTapAttendance).toHaveBeenCalledTimes(1));
    const [, marks] = mockOneTapAttendance.mock.calls[0];
    const priya = marks.find((mark) => mark.childId === '88888888-8888-8888-8888-888888888882');
    expect(priya?.status).toBe('absent');
  });

  it('shows an error message when saving fails', async () => {
    mockOneTapAttendance.mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();

    render(AttendancePage);
    await user.click(screen.getByRole('button', { name: /save attendance/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });
});
