import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import WeeklyPlanPage from './WeeklyPlanPage.svelte';

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
  getWeekly: vi.fn(),
  adjustWeekly: vi.fn(),
}));

import { adjustWeekly, getWeekly } from './api';

const mockGetWeekly = vi.mocked(getWeekly);
const mockAdjustWeekly = vi.mocked(adjustWeekly);

describe('WeeklyPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWeekly.mockResolvedValue({
      sectionId: 'section-1',
      weekStart: '2025-04-14',
      days: [
        {
          date: '2025-04-14',
          teachingDayIndex: 1,
          themeOrChapter: 'Numbers',
          mapSliceId: 'slice-1',
          overridden: false,
          notes: null,
        },
        {
          date: '2025-04-15',
          teachingDayIndex: 2,
          themeOrChapter: 'Shapes',
          mapSliceId: 'slice-2',
          overridden: false,
          notes: null,
        },
      ],
    });
  });

  it('loads the weekly plan on mount', async () => {
    render(WeeklyPlanPage);

    await waitFor(() => {
      expect(screen.getByText('Numbers')).toBeInTheDocument();
    });
    expect(screen.getByText('Shapes')).toBeInTheDocument();
    expect(screen.getByText(/week of 2025-04-14/i)).toBeInTheDocument();
    expect(mockGetWeekly).toHaveBeenCalledTimes(1);
  });

  it('override wins over base theme without regenerating the map', async () => {
    mockAdjustWeekly.mockResolvedValue({
      sectionId: 'section-1',
      weekStart: '2025-04-14',
      days: [
        {
          date: '2025-04-14',
          teachingDayIndex: 1,
          themeOrChapter: 'Adjusted theme',
          mapSliceId: 'slice-1',
          overridden: true,
          notes: 'Ran short on time',
        },
        {
          date: '2025-04-15',
          teachingDayIndex: 2,
          themeOrChapter: 'Shapes',
          mapSliceId: 'slice-2',
          overridden: false,
          notes: null,
        },
      ],
    });
    const user = userEvent.setup();

    render(WeeklyPlanPage);
    await waitFor(() => expect(mockGetWeekly).toHaveBeenCalled());

    await fireEvent.input(screen.getByLabelText('Day date'), { target: { value: '2025-04-14' } });
    await user.type(screen.getByLabelText('Theme'), 'Adjusted theme');
    await user.type(screen.getByLabelText('Notes'), 'Ran short on time');
    await user.click(screen.getByRole('button', { name: /save adjust/i }));

    await waitFor(() => {
      expect(mockAdjustWeekly).toHaveBeenCalledWith(
        '2025-04-14',
        'Adjusted theme',
        'Ran short on time',
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/Adjusted theme \(adjusted\)/)).toBeInTheDocument();
      expect(screen.getByText(/Note: Ran short on time/)).toBeInTheDocument();
    });
  });

  it('disables save until date and theme are filled, and shows saving state', async () => {
    mockAdjustWeekly.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                sectionId: 'section-1',
                weekStart: '2025-04-14',
                days: [],
              }),
            10,
          ),
        ),
    );
    const user = userEvent.setup();

    render(WeeklyPlanPage);
    await waitFor(() => expect(mockGetWeekly).toHaveBeenCalled());

    const saveButton = screen.getByRole('button', { name: /save adjust/i });
    expect(saveButton).toBeDisabled();

    await fireEvent.input(screen.getByLabelText('Day date'), { target: { value: '2025-04-14' } });
    await user.type(screen.getByLabelText('Theme'), 'Adjusted theme');
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    await waitFor(() => expect(mockAdjustWeekly).toHaveBeenCalled());
  });

  it('shows an error when the weekly plan fails to load', async () => {
    mockGetWeekly.mockRejectedValue(new Error('Failed to load weekly plan'));

    render(WeeklyPlanPage);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load weekly plan');
    });
  });
});
