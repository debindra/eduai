import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ReportReviewPage from './ReportReviewPage.svelte';
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
  draftMonthlyReport: vi.fn(),
  approveReport: vi.fn(),
}));

vi.mock('../attendance/api', () => ({
  listSectionChildren: vi.fn(),
  listAttendanceChildren: vi.fn(),
}));

import { approveReport, draftMonthlyReport } from './api';
import { listSectionChildren } from '../attendance/api';

describe('ReportReviewPage', () => {
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
    vi.mocked(listSectionChildren).mockResolvedValue({
      sectionId: 'sec-1',
      day: '2026-07-19',
      children: [{ id: 'c1', name: 'Aarav Sharma', rollNumber: '1' }],
    });
  });

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
    await waitFor(() => expect(listSectionChildren).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /draft monthly report/i })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: /draft monthly report/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Draft \(fallback\)/i })).toBeInTheDocument(),
    );
    expect(draftMonthlyReport).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 'c1' }),
    );
    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    await waitFor(() => expect(approveReport).toHaveBeenCalledWith('d1'));
    expect(draftMonthlyReport).toHaveBeenCalledTimes(1);
  });
});
