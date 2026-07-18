import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import AdminRemedialPage from './AdminRemedialPage.svelte';

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
  getAdminOpenLoopCounts: vi.fn(),
}));

import { getAdminOpenLoopCounts } from './api';

describe('AdminRemedialPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows open-loop counts without child names', async () => {
    vi.mocked(getAdminOpenLoopCounts).mockResolvedValue({
      schoolId: 'school-1',
      openCount: 2,
      byState: { opened: 2 },
    });
    render(AdminRemedialPage);
    await waitFor(() => {
      expect(screen.getByTestId('admin-open-loops')).toHaveTextContent('2 open loop');
    });
    expect(screen.queryByText(/Nisha|Rohan/)).toBeNull();
    expect(screen.getByTestId('admin-open-loops').textContent).not.toMatch(/Nisha|Rohan/);
  });
});
