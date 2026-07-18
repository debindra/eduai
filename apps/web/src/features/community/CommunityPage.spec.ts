import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import CommunityPage from './CommunityPage.svelte';

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
  getMoments: vi.fn(),
}));

import { getMoments } from './api';

describe('CommunityPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the moments library', async () => {
    vi.mocked(getMoments).mockResolvedValue({
      moments: [
        { id: 'm1', title: 'Calm circle-time start', method: 'routine', body: 'Open the day calmly.' },
        { id: 'm2', title: 'Peer-practice pairs', method: 'peer_practice', body: 'Pair learners.' },
      ],
    });

    render(CommunityPage);

    await waitFor(() => {
      expect(screen.getAllByTestId('community-moment')).toHaveLength(2);
    });
    expect(screen.getByText('Calm circle-time start')).toBeInTheDocument();
    expect(screen.getByText('Peer Practice')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(getMoments).mockRejectedValue(new Error('nope'));
    render(CommunityPage);
    await waitFor(() => {
      expect(screen.getByTestId('community-error')).toHaveTextContent('nope');
    });
  });
});
