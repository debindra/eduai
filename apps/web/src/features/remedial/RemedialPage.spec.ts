import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import RemedialPage from './RemedialPage.svelte';
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
  getRemedialPlans: vi.fn(),
}));

import { getRemedialPlans } from './api';

describe('RemedialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedTeacherContext();
  });

  it('lists named remedial plans for teachers', async () => {
    vi.mocked(getRemedialPlans).mockResolvedValue({
      sectionId: 's1',
      plans: [
        {
          id: 'p1',
          childId: 'c1',
          outcomeId: 'o1',
          sectionId: 's1',
          subjectId: 'math',
          state: 'opened',
          activityRef: null,
          childName: 'Nisha Rai',
          rollNumber: '1',
        },
      ],
    });
    render(RemedialPage);
    await waitFor(() => {
      expect(screen.getByTestId('remedial-plan')).toHaveTextContent('Nisha Rai');
    });
  });
});
