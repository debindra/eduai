import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ReportReviewPage from './ReportReviewPage.svelte';

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
  draftMonthlyReport: vi.fn(),
  approveReport: vi.fn(),
}));

import { approveReport, draftMonthlyReport } from './api';

describe('ReportReviewPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approve sends approve only after draft', async () => {
    const user = userEvent.setup();
    vi.mocked(draftMonthlyReport).mockResolvedValue({
      id: 'd1',
      bodyText: 'Neutral fallback',
      thinData: true,
      evidenceSnapshot: [],
      state: 'draft',
    });
    vi.mocked(approveReport).mockResolvedValue({});

    render(ReportReviewPage);
    await user.click(screen.getByRole('button', { name: /draft monthly report/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Draft \(fallback\)/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(approveReport).toHaveBeenCalledWith('d1'));
    expect(draftMonthlyReport).toHaveBeenCalledTimes(1);
  });
});
