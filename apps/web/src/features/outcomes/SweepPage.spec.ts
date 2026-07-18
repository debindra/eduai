import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SweepPage from './SweepPage.svelte';

vi.mock('./api', () => ({
  proposeBatchSweep: vi.fn(),
  confirmOutcome: vi.fn(),
  listProposed: vi.fn(),
}));

import { confirmOutcome, listProposed, proposeBatchSweep } from './api';

describe('SweepPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propose calls propose API, confirm calls confirm not propose', async () => {
    const user = userEvent.setup();
    vi.mocked(proposeBatchSweep).mockResolvedValue({ proposed: [{ id: 'p1' }] });
    vi.mocked(listProposed).mockResolvedValue([
      { id: 'p1', childId: 'c1', ratingCode: 'emerging', state: 'proposed' },
    ]);
    vi.mocked(confirmOutcome).mockResolvedValue({});

    render(SweepPage);

    await user.click(screen.getByRole('button', { name: /propose sweep/i }));
    await waitFor(() => expect(proposeBatchSweep).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /confirm this sweep/i }));
    await waitFor(() => expect(confirmOutcome).toHaveBeenCalledWith('p1'));
    expect(proposeBatchSweep).toHaveBeenCalledTimes(1);
  });
});
