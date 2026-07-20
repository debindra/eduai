import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmAction,
  confirmDelete,
  resetConfirmState,
  resolveConfirm,
  subscribeConfirm,
} from './confirm';

describe('confirm', () => {
  beforeEach(() => {
    resetConfirmState();
  });

  it('confirmDelete forces danger variant and default Delete label', async () => {
    const seen: string[] = [];
    const unsub = subscribeConfirm((active) => {
      if (active) {
        seen.push(`${active.variant}:${active.confirmLabel}`);
      }
    });
    const promise = confirmDelete({ title: 'Remove item?', message: 'Remove “X”?' });
    expect(seen.at(-1)).toBe('danger:Delete');
    resolveConfirm(true);
    await expect(promise).resolves.toBe(true);
    unsub();
  });

  it('resolves false when cancelled', async () => {
    const promise = confirmAction({ title: 'Sure?', message: 'Proceed?' });
    resolveConfirm(false);
    await expect(promise).resolves.toBe(false);
  });

  it('queues a second confirm until the first resolves', async () => {
    const order: string[] = [];
    const unsub = subscribeConfirm((active) => {
      if (active) order.push(active.title);
    });

    const first = confirmDelete({ title: 'First', message: 'A' });
    const second = confirmDelete({ title: 'Second', message: 'B' });
    expect(order).toEqual(['First']);

    resolveConfirm(true);
    await expect(first).resolves.toBe(true);
    expect(order.at(-1)).toBe('Second');

    resolveConfirm(false);
    await expect(second).resolves.toBe(false);
    unsub();
  });

  it('notify subscribers with null after resolve when queue empty', async () => {
    const listener = vi.fn();
    const unsub = subscribeConfirm(listener);
    listener.mockClear();

    const promise = confirmDelete({ title: 'T', message: 'M' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'T', variant: 'danger' }),
    );

    resolveConfirm(true);
    await promise;
    expect(listener).toHaveBeenLastCalledWith(null);
    unsub();
  });
});
