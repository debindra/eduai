/**
 * App-wide confirm dialog API. Call sites await before destructive API work.
 * ConfirmDialogHost must be mounted (see App.svelte) for the UI to appear.
 */

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
};

export type ActiveConfirm = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'danger' | 'default';
};

type ConfirmRequest = ActiveConfirm & {
  resolve: (value: boolean) => void;
};

let current: ConfirmRequest | null = null;
const queue: ConfirmRequest[] = [];
const listeners = new Set<(active: ActiveConfirm | null) => void>();

function toActive(req: ConfirmRequest): ActiveConfirm {
  return {
    title: req.title,
    message: req.message,
    confirmLabel: req.confirmLabel,
    cancelLabel: req.cancelLabel,
    variant: req.variant,
  };
}

function notify(): void {
  const active = current ? toActive(current) : null;
  for (const listener of listeners) {
    listener(active);
  }
}

/** Subscribe to the open confirm (or null). Used by ConfirmDialogHost. */
export function subscribeConfirm(
  listener: (active: ActiveConfirm | null) => void,
): () => void {
  listeners.add(listener);
  listener(current ? toActive(current) : null);
  return () => {
    listeners.delete(listener);
  };
}

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const request: ConfirmRequest = {
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      variant: opts.variant ?? 'default',
      resolve,
    };
    if (!current) {
      current = request;
      notify();
    } else {
      queue.push(request);
    }
  });
}

/** Destructive confirm — forces danger variant; default confirm label “Delete”. */
export function confirmDelete(
  opts: Omit<ConfirmOptions, 'variant'>,
): Promise<boolean> {
  return confirmAction({
    ...opts,
    variant: 'danger',
    confirmLabel: opts.confirmLabel ?? 'Delete',
  });
}

/** Resolve the open dialog (true = confirmed). Advances the queue if any. */
export function resolveConfirm(value: boolean): void {
  if (!current) return;
  const { resolve } = current;
  current = null;
  resolve(value);
  const next = queue.shift();
  if (next) {
    current = next;
  }
  notify();
}

/** Test helper — cancel open + queued confirms and clear listeners' view. */
export function resetConfirmState(): void {
  if (current) {
    current.resolve(false);
    current = null;
  }
  while (queue.length > 0) {
    const pending = queue.shift();
    pending?.resolve(false);
  }
  notify();
}
