/**
 * Shared pattern for teacher pages that reload when section/subject changes.
 * Ignores stale responses when the assignment key changes mid-flight.
 */
export function createAssignmentLoadGate() {
  let generation = 0;

  return {
    begin(assignmentKey: string | null): number | null {
      if (!assignmentKey) return null;
      generation += 1;
      return generation;
    },
    isCurrent(token: number): boolean {
      return token === generation;
    },
  };
}
