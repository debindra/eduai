import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../../lib/shared/stores/session';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
  push: vi.fn(),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('../calendar/components/CalendarBoard.svelte', async () => {
  const mod = await import('./__mocks__/CalendarBoardStub.svelte');
  return { default: mod.default };
});

vi.mock('./api', () => ({
  listNationalCalendars: vi.fn(),
  createNationalCalendar: vi.fn(),
  patchNationalClosures: vi.fn(),
  patchNationalWeeklyOffs: vi.fn(),
  publishNationalCalendar: vi.fn(),
  unpublishNationalCalendar: vi.fn(),
}));

import NationalCalendarPage from './NationalCalendarPage.svelte';
import {
  listNationalCalendars,
  publishNationalCalendar,
  unpublishNationalCalendar,
} from './api';

const mockList = vi.mocked(listNationalCalendars);
const mockPublish = vi.mocked(publishNationalCalendar);
const mockUnpublish = vi.mocked(unpublishNationalCalendar);

const draftCalendar = {
  id: 'nat-1',
  bsYear: 2082,
  status: 'draft' as const,
  weeklyOffs: [6],
  closures: [],
};

const publishedCalendar = {
  ...draftCalendar,
  status: 'published' as const,
};

describe('NationalCalendarPage', () => {
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

  it('shows Publish for a draft calendar', async () => {
    mockList.mockResolvedValue({ calendars: [draftCalendar] });

    render(NationalCalendarPage);

    await waitFor(() => {
      expect(screen.getByTestId('national-calendar-publish')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('national-calendar-unpublish')).not.toBeInTheDocument();
    expect(screen.getByTestId('national-weekly-offs-save')).toBeInTheDocument();
  });

  it('shows Edit again for a published calendar and unpublishes to draft', async () => {
    const user = userEvent.setup();
    mockList
      .mockResolvedValueOnce({ calendars: [publishedCalendar] })
      .mockResolvedValueOnce({ calendars: [draftCalendar] });
    mockUnpublish.mockResolvedValue(draftCalendar);

    render(NationalCalendarPage);

    await waitFor(() => {
      expect(screen.getByTestId('national-calendar-unpublish')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('national-calendar-publish')).not.toBeInTheDocument();
    expect(screen.queryByTestId('national-weekly-offs-save')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('national-calendar-unpublish'));

    await waitFor(() => {
      expect(mockUnpublish).toHaveBeenCalledWith('nat-1');
      expect(screen.getByTestId('national-calendar-publish')).toBeInTheDocument();
      expect(screen.getByTestId('national-weekly-offs-save')).toBeInTheDocument();
    });
    expect(screen.getByText(/Returned to draft/i)).toBeInTheDocument();
  });

  it('publishes a draft calendar', async () => {
    const user = userEvent.setup();
    mockList
      .mockResolvedValueOnce({ calendars: [draftCalendar] })
      .mockResolvedValueOnce({ calendars: [publishedCalendar] });
    mockPublish.mockResolvedValue(publishedCalendar);

    render(NationalCalendarPage);

    await waitFor(() => {
      expect(screen.getByTestId('national-calendar-publish')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('national-calendar-publish'));

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith('nat-1');
      expect(screen.getByTestId('national-calendar-unpublish')).toBeInTheDocument();
    });
  });
});
