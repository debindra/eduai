import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import OversightPage from './OversightPage.svelte';

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
  getClassTeacherOversight: vi.fn(),
}));

import { getClassTeacherOversight } from './api';

describe('OversightPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows per-child letter grades without ranking', async () => {
    vi.mocked(getClassTeacherOversight).mockResolvedValue({
      sectionId: 's1',
      sectionName: 'Grade 1 A',
      grade: 'Grade 1',
      children: [
        {
          childId: 'c1',
          name: 'Nisha Rai',
          rollNumber: '1',
          letterCode: 'B',
          percent: 70,
        },
      ],
    });
    render(OversightPage);
    await waitFor(() => {
      expect(screen.getByTestId('oversight-view')).toHaveTextContent('Grade 1 A');
    });
    expect(screen.getByTestId('oversight-view')).toHaveTextContent('Nisha Rai');
    expect(screen.getByTestId('oversight-view')).toHaveTextContent('B');
  });
});
