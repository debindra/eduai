import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog.svelte';
import ConfirmDialogHost from './ConfirmDialogHost.svelte';
import {
  confirmDelete,
  resetConfirmState,
} from '../confirm';

describe('ConfirmDialog', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: {
        title: 'Remove item?',
        message: 'Remove “Sports Day”?',
        variant: 'danger',
        onConfirm,
        onCancel,
      },
    });

    await user.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: {
        title: 'Remove item?',
        message: 'Remove “Sports Day”?',
        confirmLabel: 'Delete',
        variant: 'danger',
        onConfirm,
        onCancel,
      },
    });

    expect(screen.getByTestId('confirm-dialog')).toHaveAttribute('data-variant', 'danger');
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel on Escape and overlay click', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(ConfirmDialog, {
      props: {
        title: 'T',
        message: 'M',
        onConfirm: vi.fn(),
        onCancel,
      },
    });

    await screen.findByTestId('confirm-dialog');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();

    onCancel.mockClear();
    await user.click(screen.getByTestId('confirm-dialog-overlay'));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ConfirmDialogHost', () => {
  beforeEach(() => {
    resetConfirmState();
  });

  it('resolves confirmDelete true when Confirm is clicked', async () => {
    const user = userEvent.setup();
    render(ConfirmDialogHost);

    const promise = confirmDelete({
      title: 'Delete section?',
      message: 'Delete “Nursery A”?',
    });

    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-dialog-confirm'));
    await expect(promise).resolves.toBe(true);
  });

  it('resolves false when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(ConfirmDialogHost);

    const promise = confirmDelete({
      title: 'Delete section?',
      message: 'Delete “Nursery A”?',
    });

    await screen.findByTestId('confirm-dialog');
    await user.click(screen.getByTestId('confirm-dialog-cancel'));
    await expect(promise).resolves.toBe(false);
  });
});
