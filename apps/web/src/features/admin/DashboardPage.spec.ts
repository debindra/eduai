import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import DashboardPage from './DashboardPage.svelte';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('./api', () => ({
  getAdminDashboard: vi.fn(),
}));

import { getAdminDashboard } from './api';

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders counts without child-name props', async () => {
    vi.mocked(getAdminDashboard).mockResolvedValue({
      schoolId: 'school-1',
      periodStart: '2025-04-01',
      periodEnd: '2025-04-30',
      coverageBySection: [{ sectionId: '66666666-6666-6666-6666-666666666666', childrenWithFreshOutcomes: 2 }],
      sectionsBehindCount: 1,
      sectionsTotal: 1,
      communicationReplyWithinDayRate: 0.5,
      needsSupportBySection: [{ sectionId: '66666666-6666-6666-6666-666666666666', stalledCount: 0 }],
    });
    render(DashboardPage);
    await waitFor(() => {
      expect(screen.getByTestId('sections-behind')).toHaveTextContent('1 / 1');
    });
    expect(screen.queryByText(/Priya|child name/i)).not.toBeInTheDocument();
  });
});
