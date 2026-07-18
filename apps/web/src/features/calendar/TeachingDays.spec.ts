import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import TeachingDays from './TeachingDays.svelte';

vi.mock('./api', () => ({
  getTeachingDays: vi.fn(),
}));

import { getTeachingDays } from './api';

const mockGetTeachingDays = vi.mocked(getTeachingDays);

describe('TeachingDays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows terminal teaching day counts after load', async () => {
    mockGetTeachingDays.mockResolvedValue({
      schoolId: 'school-1',
      terminals: [
        {
          terminalId: 'term-1',
          terminalName: 'Terminal 1',
          teachingDayCount: 99,
        },
        {
          terminalId: 'term-2',
          terminalName: 'Terminal 2',
          teachingDayCount: 100,
        },
      ],
    });

    render(TeachingDays);

    await waitFor(() => {
      expect(screen.getByText('Terminal 1')).toBeInTheDocument();
    });
    expect(screen.getByText('99 days')).toBeInTheDocument();
    expect(screen.getByText('100 days')).toBeInTheDocument();
  });

  it('shows error when teaching days cannot be loaded', async () => {
    mockGetTeachingDays.mockRejectedValue(new Error('Network error'));

    render(TeachingDays);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
