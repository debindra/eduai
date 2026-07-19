import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import ManagePage from './ManagePage.svelte';
import { seedTeacherContext } from '../../lib/shared/stores/teacher-context.test-helpers';

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
  getFestivalPlanner: vi.fn(),
  getSettlingProgramme: vi.fn(),
  getSubstitutePack: vi.fn(),
}));

import { getFestivalPlanner, getSettlingProgramme, getSubstitutePack } from './api';

describe('ManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedTeacherContext();
  });

  it('shows festival planner and settling programme', async () => {
    vi.mocked(getFestivalPlanner).mockResolvedValue({
      sectionId: 's1',
      pacingState: 'on_track',
      gapTeachingDays: 0,
      festivals: [{ id: '1', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
    });
    vi.mocked(getSettlingProgramme).mockResolvedValue({
      bandId: 'b1',
      steps: [{ weekNumber: 1, title: 'Welcome', body: 'Routines' }],
    });
    vi.mocked(getSubstitutePack).mockResolvedValue({
      sectionId: 's1',
      day: '2025-04-15',
      roster: [],
      note: 'Substitute access is read-only',
    });
    render(ManagePage);
    await waitFor(() => {
      expect(screen.getByTestId('festival-planner')).toHaveTextContent('Dashain');
    });
    expect(screen.getByTestId('settling-programme')).toHaveTextContent('Welcome');
  });
});
