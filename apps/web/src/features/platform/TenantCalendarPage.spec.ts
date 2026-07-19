import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../lib/shared/stores/session';

const push = vi.fn();

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
  push: (...args: unknown[]) => push(...args),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('../shared/NepaliDatePicker.svelte', async () => {
  const { default: Mock } = await import('../shared/NepaliDatePickerMock.svelte');
  return { default: Mock };
});

vi.mock('./api', () => ({
  listPlatformSchools: vi.fn(),
  listNationalCalendars: vi.fn(),
  setupPlatformSchoolCalendar: vi.fn(),
  ensurePlatformSchoolCalendarDraft: vi.fn(),
  getPlatformSchoolCalendarClosures: vi.fn(),
  patchPlatformSchoolCalendarClosures: vi.fn(),
  approvePlatformSchoolCalendar: vi.fn(),
}));

import TenantCalendarPage from './TenantCalendarPage.svelte';
import {
  approvePlatformSchoolCalendar,
  ensurePlatformSchoolCalendarDraft,
  getPlatformSchoolCalendarClosures,
  listNationalCalendars,
  listPlatformSchools,
  patchPlatformSchoolCalendarClosures,
} from './api';

const mockList = vi.mocked(listPlatformSchools);
const mockListNational = vi.mocked(listNationalCalendars);
const mockGetClosures = vi.mocked(getPlatformSchoolCalendarClosures);
const mockEnsureDraft = vi.mocked(ensurePlatformSchoolCalendarDraft);
const mockPatchClosures = vi.mocked(patchPlatformSchoolCalendarClosures);
const mockApprove = vi.mocked(approvePlatformSchoolCalendar);

describe('TenantCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    setSession({
      accessToken: 'token',
      identity: {
        id: 'pa',
        email: 'platform@eduai.dev',
        phone: null,
        displayName: 'Platform',
      },
      memberType: 'super_admin',
      schoolId: null,
    });
    mockListNational.mockResolvedValue({
      calendars: [
        {
          id: 'nat-1',
          bsYear: 2082,
          status: 'published',
          weeklyOffs: [6],
          closures: [],
        },
      ],
    });
  });

  it('shows setup step when school has no calendar', async () => {
    mockList.mockResolvedValue({
      schools: [
        {
          id: 'school-1',
          name: 'School X',
          region: null,
          tier: null,
          licensedBandRange: null,
          exitStatus: null,
          calendarStatus: 'none',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
      ],
    });

    render(TenantCalendarPage, { props: { routeParams: { schoolId: 'school-1' } } });

    await waitFor(() => {
      expect(screen.getByTestId('tenant-calendar-page')).toBeInTheDocument();
      expect(screen.getByText('Draft calendar')).toBeInTheDocument();
    });
  });

  it('loads closures step when draft exists', async () => {
    mockList.mockResolvedValue({
      schools: [
        {
          id: 'school-1',
          name: 'School X',
          region: null,
          tier: null,
          licensedBandRange: null,
          exitStatus: null,
          calendarStatus: 'draft',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
      ],
    });
    mockEnsureDraft.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
      hasLiveApproved: false,
    });
    mockGetClosures.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'draft',
      bsYear: 2082,
      nationalClosures: [],
      closures: [],
    });

    render(TenantCalendarPage, { props: { routeParams: { schoolId: 'school-1' } } });

    await waitFor(() => {
      expect(mockEnsureDraft).toHaveBeenCalledWith('school-1');
      expect(mockGetClosures).toHaveBeenCalledWith('school-1');
      expect(screen.getByTestId('tenant-calendar-closures')).toBeInTheDocument();
      expect(screen.getByTestId('closures-save-draft')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve calendar/i })).toBeInTheDocument();
    });
  });

  it('saves draft without approving, and approve publishes', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      schools: [
        {
          id: 'school-1',
          name: 'School X',
          region: null,
          tier: null,
          licensedBandRange: null,
          exitStatus: null,
          calendarStatus: 'draft',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
      ],
    });
    mockEnsureDraft.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
      hasLiveApproved: false,
    });
    mockGetClosures.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'draft',
      bsYear: 2082,
      nationalClosures: [],
      closures: [
        {
          id: 'c1',
          name: 'Sports day',
          startDate: '2025-06-01',
          endDate: '2025-06-01',
          category: 'eca',
        },
      ],
    });
    mockPatchClosures.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'draft',
      bsYear: 2082,
      nationalClosures: [],
      closures: [
        {
          id: 'c1',
          name: 'Sports day',
          startDate: '2025-06-01',
          endDate: '2025-06-01',
          category: 'eca',
        },
      ],
    });
    mockApprove.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'approved',
      approvedAt: '2025-06-02T00:00:00Z',
    });

    render(TenantCalendarPage, { props: { routeParams: { schoolId: 'school-1' } } });

    await waitFor(() => {
      expect(screen.getByTestId('closures-save-draft')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('closures-save-draft'));
    await waitFor(() => {
      expect(mockPatchClosures).toHaveBeenCalledWith('school-1', [
        {
          id: 'c1',
          name: 'Sports day',
          startDate: '2025-06-01',
          endDate: '2025-06-01',
          category: 'eca',
        },
      ]);
      expect(mockApprove).not.toHaveBeenCalled();
      expect(screen.getByText('Draft saved.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /approve calendar/i }));
    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('school-1');
      expect(
        screen.getByText(/Calendar approved for School X/i),
      ).toBeInTheDocument();
    });
  });

  it('loads approved calendar as read-only with Edit action', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      schools: [
        {
          id: 'school-1',
          name: 'School X',
          region: null,
          tier: null,
          licensedBandRange: null,
          exitStatus: null,
          calendarStatus: 'approved',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
      ],
    });
    mockGetClosures
      .mockResolvedValueOnce({
        schoolCalendarId: 'cal-1',
        academicYearLabel: '2082/83',
        approvalStatus: 'approved',
        bsYear: 2082,
        nationalClosures: [],
        closures: [{ id: 'c1', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-05' }],
      })
      .mockResolvedValueOnce({
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
        approvalStatus: 'draft',
        bsYear: 2082,
        nationalClosures: [],
        closures: [{ id: 'c2', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-05' }],
      });
    mockEnsureDraft.mockResolvedValue({
      schoolCalendarId: 'cal-draft',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
      clonedFromApproved: true,
      hasLiveApproved: true,
    });

    render(TenantCalendarPage, { props: { routeParams: { schoolId: 'school-1' } } });

    await waitFor(() => {
      expect(screen.getByTestId('tenant-calendar-readonly')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-calendar-edit')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-calendar-approved-title')).toHaveTextContent(
        'School X · 2082/83 Academic Calendar',
      );
    });

    await user.click(screen.getByTestId('tenant-calendar-edit'));
    await waitFor(() => {
      expect(mockEnsureDraft).toHaveBeenCalledWith('school-1');
      expect(screen.getByTestId('tenant-calendar-closures')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-calendar-live-banner')).toBeInTheDocument();
      expect(screen.getByText('Configure calendar')).toBeInTheDocument();
    });
  });

  it('exits back to tenant monitoring', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      schools: [
        {
          id: 'school-1',
          name: 'School X',
          region: null,
          tier: null,
          licensedBandRange: null,
          exitStatus: null,
          calendarStatus: 'approved',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
      ],
    });
    mockGetClosures.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'approved',
      bsYear: 2082,
      nationalClosures: [],
      closures: [],
    });

    render(TenantCalendarPage, { props: { routeParams: { schoolId: 'school-1' } } });

    await waitFor(() => {
      expect(screen.getByTestId('tenant-calendar-readonly')).toBeInTheDocument();
      expect(screen.getByTestId('tenant-calendar-approved-title')).toHaveTextContent(
        'School X · 2082/83 Academic Calendar',
      );
    });
    await user.click(screen.getByTestId('tenant-calendar-exit'));
    expect(push).toHaveBeenCalledWith('/platform/schools');
  });

  it('shows missing school id when routeParams omit schoolId', async () => {
    render(TenantCalendarPage, { props: { routeParams: {} } });

    await waitFor(() => {
      expect(screen.getByText('Missing school id')).toBeInTheDocument();
    });
  });
});
