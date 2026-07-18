import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DailyLessonPage from './DailyLessonPage.svelte';
import { ApiError } from '../../lib/shared/api/client';

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
  getDaily: vi.fn(),
  generateLesson: vi.fn(),
  markLessonDone: vi.fn(),
}));

import { generateLesson, getDaily, markLessonDone } from './api';

const mockGetDaily = vi.mocked(getDaily);
const mockGenerateLesson = vi.mocked(generateLesson);
const mockMarkLessonDone = vi.mocked(markLessonDone);

describe('DailyLessonPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDaily.mockResolvedValue({
      date: '2025-04-14',
      themeOrChapter: 'Numbers 1-10',
      mapSliceId: 'slice-1',
    });
  });

  it('loads the pre-filled theme from the weekly cell on mount', async () => {
    render(DailyLessonPage);

    await waitFor(() => {
      expect(screen.getByText(/Numbers 1-10/)).toBeInTheDocument();
    });
    expect(mockGetDaily).toHaveBeenCalledTimes(1);
  });

  it('generates a lesson grounded in the map slice', async () => {
    mockGenerateLesson.mockResolvedValue({
      id: 'lesson-1',
      pedagogyType: 'phonics',
      theme: 'Numbers 1-10',
      content: {},
    });
    const user = userEvent.setup();

    render(DailyLessonPage);
    await waitFor(() => expect(mockGetDaily).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /generate lesson/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pedagogy: phonics/)).toBeInTheDocument();
    });
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(mockGenerateLesson).toHaveBeenCalledWith(todayIso);
  });

  it('marking taught calls only mark-done, never generate (coverage separate from learning)', async () => {
    mockMarkLessonDone.mockResolvedValue({});
    const user = userEvent.setup();

    render(DailyLessonPage);
    await waitFor(() => expect(mockGetDaily).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /mark taught/i }));

    await waitFor(() => expect(mockMarkLessonDone).toHaveBeenCalledWith('slice-1'));
    expect(mockGenerateLesson).not.toHaveBeenCalled();
  });

  it('shows an error when load fails', async () => {
    mockGetDaily.mockRejectedValue(new Error('Load failed'));

    render(DailyLessonPage);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
    });
  });

  it('shows a neutral "not a teaching day" message instead of a raw error for weekends/holidays', async () => {
    mockGetDaily.mockRejectedValue(
      new ApiError('No teaching day plan for 2026-07-19', 404),
    );

    render(DailyLessonPage);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('No school on this day');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate lesson/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mark taught/i })).toBeDisabled();
  });
});
