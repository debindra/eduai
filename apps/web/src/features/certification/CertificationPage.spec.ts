import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import CertificationPage from './CertificationPage.svelte';

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
  getMyCertification: vi.fn(),
}));

import { getMyCertification } from './api';

describe('CertificationPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the 12-week progress with overall status', async () => {
    vi.mocked(getMyCertification).mockResolvedValue({
      teacherId: 't1',
      status: 'in_programme',
      weeks: Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        status: i < 3 ? 'quiz_passed' : 'not_started',
        quizScore: i < 3 ? 0.9 : null,
      })),
      observation: { status: 'pending', score: null },
    });

    render(CertificationPage);

    await waitFor(() => {
      expect(screen.getByTestId('cert-summary')).toHaveTextContent('In programme');
    });
    expect(screen.getByTestId('cert-summary')).toHaveTextContent('3 / 12 weeks passed');
    expect(screen.getAllByTestId('cert-week')).toHaveLength(12);
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(getMyCertification).mockRejectedValue(new Error('nope'));
    render(CertificationPage);
    await waitFor(() => {
      expect(screen.getByTestId('cert-error')).toHaveTextContent('nope');
    });
  });
});
