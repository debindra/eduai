import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import InboxPage from './InboxPage.svelte';

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
  listTeacherDrafts: vi.fn(),
  approveDraft: vi.fn(),
}));

import { listTeacherDrafts } from './api';

describe('InboxPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows draft reply for approval', async () => {
    vi.mocked(listTeacherDrafts).mockResolvedValue([
      {
        id: 'm1',
        threadId: 'child:c1',
        direction: 'inbound',
        intentRoute: 'teacher_queue',
        contentRef: 'How can I help?',
        draftReply: 'Try counting with beans.',
        approvalStatus: 'draft',
      },
    ]);
    render(InboxPage);
    await waitFor(() => {
      expect(screen.getByTestId('draft-reply')).toHaveTextContent('counting');
    });
  });
});
