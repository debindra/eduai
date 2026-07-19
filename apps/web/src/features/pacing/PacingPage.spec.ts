import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import PacingPage from './PacingPage.svelte';
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
  getPacing: vi.fn(),
}));

import { getPacing } from './api';

describe('PacingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedTeacherContext();
  });

  it('shows three-state badge without outcome ratings', async () => {
    vi.mocked(getPacing).mockResolvedValue({
      state: 'behind',
      gapTeachingDays: 4,
      teachingDaysRemaining: 80,
      plannedIndex: 12,
      actualDone: 8,
    });
    render(PacingPage);
    await waitFor(() => {
      expect(screen.getByTestId('pacing-badge')).toHaveTextContent('Behind');
    });
    expect(screen.queryByText(/outcome/i)).not.toBeInTheDocument();
  });
});
