import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CalendarWizard from './CalendarWizard.svelte';

vi.mock('./api', () => ({
  setupCalendar: vi.fn(),
  getCalendarStatus: vi.fn(),
  getFestivalTemplate: vi.fn(),
  patchFestivalTemplate: vi.fn(),
  approveCalendar: vi.fn(),
  getTeachingDays: vi.fn(),
}));

import {
  approveCalendar,
  getCalendarStatus,
  getFestivalTemplate,
  getTeachingDays,
  patchFestivalTemplate,
  setupCalendar,
} from './api';

const mockSetupCalendar = vi.mocked(setupCalendar);
const mockGetCalendarStatus = vi.mocked(getCalendarStatus);
const mockGetFestivalTemplate = vi.mocked(getFestivalTemplate);
const mockPatchFestivalTemplate = vi.mocked(patchFestivalTemplate);
const mockApproveCalendar = vi.mocked(approveCalendar);
const mockGetTeachingDays = vi.mocked(getTeachingDays);

describe('CalendarWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCalendarStatus.mockResolvedValue({
      approvalStatus: 'none',
      schoolCalendarId: null,
    });
    mockGetTeachingDays.mockResolvedValue({ schoolId: 'school-1', terminals: [] });
  });

  it('starts at step 1 (setup) when no calendar exists', async () => {
    render(CalendarWizard);

    await waitFor(() => {
      expect(mockGetCalendarStatus).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByLabelText(/academic year label/i)).toBeInTheDocument();
  });

  it('resumes at the festivals step when a draft already exists', async () => {
    mockGetCalendarStatus.mockResolvedValue({
      approvalStatus: 'draft',
      schoolCalendarId: 'cal-1',
    });
    mockGetFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [{ id: 'c1', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
    });

    render(CalendarWizard);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Dashain')).toBeInTheDocument();
    });
    expect(mockGetFestivalTemplate).toHaveBeenCalledTimes(1);
  });

  it('resumes at the approve step when the calendar is already approved', async () => {
    mockGetCalendarStatus.mockResolvedValue({
      approvalStatus: 'approved',
      schoolCalendarId: 'cal-2',
      academicYearLabel: '2082/83',
    });

    render(CalendarWizard);

    await waitFor(() => {
      expect(screen.getByText(/Calendar for 2082\/83 is approved/)).toBeInTheDocument();
    });
    expect(mockGetFestivalTemplate).not.toHaveBeenCalled();
  });

  it('completes the full setup → festivals → approve flow', async () => {
    mockSetupCalendar.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
    });
    mockGetFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [{ id: 'c1', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
    });
    mockPatchFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [],
    });
    mockApproveCalendar.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'approved',
      approvedAt: '2025-04-20T00:00:00Z',
    });
    const user = userEvent.setup();

    render(CalendarWizard);
    await waitFor(() => expect(mockGetCalendarStatus).toHaveBeenCalled());

    await user.clear(screen.getByLabelText(/academic year label/i));
    await user.type(screen.getByLabelText(/academic year label/i), '2082/83');
    await user.type(screen.getByLabelText(/session start/i), '2025-04-14');
    await user.type(screen.getByLabelText(/session end/i), '2026-04-13');
    await user.type(screen.getByLabelText(/terminal name/i), 'Terminal 1');
    await user.type(screen.getByLabelText(/terminal start/i), '2025-04-14');
    await user.type(screen.getByLabelText(/terminal end/i), '2025-07-14');
    await user.click(screen.getByRole('button', { name: /continue to festivals/i }));

    await waitFor(() => expect(mockSetupCalendar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByDisplayValue('Dashain')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /continue to approve/i }));
    await waitFor(() => expect(mockPatchFestivalTemplate).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approve calendar/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /approve calendar/i }));

    await waitFor(() => expect(mockApproveCalendar).toHaveBeenCalledTimes(1));
  });

  it('continues to festivals when setup reports a draft already exists', async () => {
    mockSetupCalendar.mockRejectedValue(new Error('A draft calendar already exists'));
    mockGetFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [],
    });
    const user = userEvent.setup();

    render(CalendarWizard);
    await waitFor(() => expect(mockGetCalendarStatus).toHaveBeenCalled());

    await user.clear(screen.getByLabelText(/academic year label/i));
    await user.type(screen.getByLabelText(/academic year label/i), '2082/83');
    await user.type(screen.getByLabelText(/session start/i), '2025-04-14');
    await user.type(screen.getByLabelText(/session end/i), '2026-04-13');
    await user.type(screen.getByLabelText(/terminal name/i), 'Terminal 1');
    await user.type(screen.getByLabelText(/terminal start/i), '2025-04-14');
    await user.type(screen.getByLabelText(/terminal end/i), '2025-07-14');
    await user.click(screen.getByRole('button', { name: /continue to festivals/i }));

    await waitFor(() => expect(mockGetFestivalTemplate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('A draft calendar already exists')).not.toBeInTheDocument();
  });
});
