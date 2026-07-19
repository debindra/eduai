import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SweepPage from './SweepPage.svelte';
import { teacherContext } from '../../lib/shared/stores/teacher-context';

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
  proposeBatchSweep: vi.fn(),
  confirmOutcome: vi.fn(),
  listProposed: vi.fn(),
  getSweepContext: vi.fn(),
}));

import { confirmOutcome, getSweepContext, proposeBatchSweep } from './api';

describe('SweepPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teacherContext.set({
      teacherId: 't1',
      assignments: [
        {
          sectionId: 'sec-1',
          sectionName: 'UKG A',
          grade: 'UKG',
          bandId: 'band-pp',
          assessmentMode: 'three_state_narrative',
          subjectId: null,
          subjectName: null,
          isClassTeacher: true,
        },
      ],
      selected: {
        sectionId: 'sec-1',
        sectionName: 'UKG A',
        grade: 'UKG',
        bandId: 'band-pp',
        assessmentMode: 'three_state_narrative',
        subjectId: null,
        subjectName: null,
        isClassTeacher: true,
      },
    });
    vi.mocked(getSweepContext).mockResolvedValue({
      sectionId: 'sec-1',
      bandId: 'band-pp',
      subjectId: null,
      children: [
        { childId: 'c1', name: 'Aarav', rollNumber: '1' },
        { childId: 'c2', name: 'Priya', rollNumber: '2' },
      ],
      outcomes: [
        {
          outcomeId: 'o1',
          code: 'PP-SELF-001',
          statement: 'Shows awareness of self',
        },
      ],
    });
  });

  it('loads live children then propose/confirm without calling propose on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(proposeBatchSweep).mockResolvedValue({ proposed: [{ id: 'p1' }] });
    vi.mocked(confirmOutcome).mockResolvedValue({});

    render(SweepPage);

    await waitFor(() => expect(getSweepContext).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Aarav')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /propose sweep/i }));
    await waitFor(() => expect(proposeBatchSweep).toHaveBeenCalled());
    expect(proposeBatchSweep.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ childId: 'c1', outcomeId: 'o1' }),
      ]),
    );

    await user.click(screen.getByRole('button', { name: /confirm this sweep/i }));
    await waitFor(() => expect(confirmOutcome).toHaveBeenCalledWith('p1'));
    expect(proposeBatchSweep).toHaveBeenCalledTimes(1);
  });
});
