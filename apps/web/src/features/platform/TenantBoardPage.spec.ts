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

vi.mock('./api', () => ({
  listPlatformSchools: vi.fn(),
  createPlatformSchool: vi.fn(),
  ensurePlatformSchoolCalendarDraft: vi.fn(),
}));

import TenantBoardPage from './TenantBoardPage.svelte';
import {
  createPlatformSchool,
  ensurePlatformSchoolCalendarDraft,
  listPlatformSchools,
} from './api';

const mockListPlatformSchools = vi.mocked(listPlatformSchools);
const mockCreatePlatformSchool = vi.mocked(createPlatformSchool);
const mockEnsureDraft = vi.mocked(ensurePlatformSchoolCalendarDraft);

const sampleSchool = {
  id: 'school-1',
  name: 'School X (dev)',
  region: 'Kathmandu',
  tier: 'pilot',
  licensedBandRange: 'pre_primary,basic_early,basic_upper',
  exitStatus: null,
  calendarStatus: 'none' as const,
  sectionsTotal: 15,
  sectionsBehind: 15,
  teachersTotal: 8,
  studentsTotal: 120,
  subjectsTotal: 5,
};

describe('TenantBoardPage', () => {
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
  });

  it('shows create button and opens modal', async () => {
    const user = userEvent.setup();
    mockListPlatformSchools.mockResolvedValue({ schools: [sampleSchool] });

    render(TenantBoardPage);

    await waitFor(() => {
      expect(screen.getByTestId('tenant-table')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('tenant-create-modal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('tenant-create-open'));
    expect(screen.getByTestId('tenant-create-modal')).toBeInTheDocument();
  });

  it('creates tenant from modal then navigates to calendar page', async () => {
    const user = userEvent.setup();
    mockListPlatformSchools.mockResolvedValue({ schools: [] });
    mockCreatePlatformSchool.mockResolvedValue({
      school: { ...sampleSchool, id: 'school-new', name: 'School Y' },
      admin: { identityId: 'id-1', delivery: 'email' },
    });

    render(TenantBoardPage);

    await waitFor(() => {
      expect(screen.getByTestId('tenant-create-open')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('tenant-create-open'));
    await user.type(screen.getByTestId('tenant-name'), 'School Y');
    await user.type(screen.getByTestId('tenant-admin-email'), 'admin@y.dev');
    await user.click(screen.getByTestId('tenant-create-submit'));

    await waitFor(() => {
      expect(mockCreatePlatformSchool).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/platform/schools/school-new/calendar');
    });
  });

  it('navigates to calendar page from list setup action', async () => {
    const user = userEvent.setup();
    mockListPlatformSchools.mockResolvedValue({ schools: [sampleSchool] });

    render(TenantBoardPage);

    await waitFor(() => {
      expect(screen.getByTestId('setup-calendar-school-1')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('setup-calendar-school-1'));

    expect(push).toHaveBeenCalledWith('/platform/schools/school-1/calendar');
  });

  it('shows View and Edit for approved tenants; Edit ensures draft then navigates', async () => {
    const user = userEvent.setup();
    mockListPlatformSchools.mockResolvedValue({
      schools: [{ ...sampleSchool, calendarStatus: 'approved' }],
    });
    mockEnsureDraft.mockResolvedValue({
      schoolCalendarId: 'cal-draft',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
      clonedFromApproved: true,
      hasLiveApproved: true,
    });

    render(TenantBoardPage);

    await waitFor(() => {
      expect(screen.getByTestId('view-calendar-school-1')).toHaveTextContent('View calendar');
      expect(screen.getByTestId('edit-calendar-school-1')).toHaveTextContent('Edit calendar');
    });

    await user.click(screen.getByTestId('edit-calendar-school-1'));
    await waitFor(() => {
      expect(mockEnsureDraft).toHaveBeenCalledWith('school-1');
      expect(push).toHaveBeenCalledWith('/platform/schools/school-1/calendar');
    });
  });
});
