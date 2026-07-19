/**
 * Normalize an unknown thrown value into a user-facing message.
 * Replaces the `err instanceof Error ? err.message : 'fallback'` boilerplate
 * repeated across feature `catch` blocks.
 */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
