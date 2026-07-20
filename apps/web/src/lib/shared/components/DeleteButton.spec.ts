import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DeleteButton from './DeleteButton.svelte';
import ConfirmDialogHost from './ConfirmDialogHost.svelte';
import { resetConfirmState } from '../confirm';

describe('DeleteButton', () => {
  beforeEach(() => {
    resetConfirmState();
  });

  it('calls onConfirm only after dialog confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(ConfirmDialogHost);
    render(DeleteButton, {
      props: {
        label: 'Remove',
        confirmTitle: 'Remove item?',
        confirmMessage: 'Remove “Sports Day”?',
        onConfirm,
        testId: 'delete-btn',
      },
    });

    await user.click(screen.getByTestId('delete-btn'));
    expect(onConfirm).not.toHaveBeenCalled();

    await screen.findByTestId('confirm-dialog');
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not call onConfirm when cancelled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(ConfirmDialogHost);
    render(DeleteButton, {
      props: {
        confirmTitle: 'Remove item?',
        confirmMessage: 'Remove “X”?',
        onConfirm,
        testId: 'delete-btn',
      },
    });

    await user.click(screen.getByTestId('delete-btn'));
    await screen.findByTestId('confirm-dialog');
    await user.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
