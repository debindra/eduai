import { describe, expect, it } from 'vitest';
import { createAssignmentLoadGate } from './assignment-load-gate';

describe('createAssignmentLoadGate', () => {
  it('returns null when assignment key is missing', () => {
    const gate = createAssignmentLoadGate();
    expect(gate.begin(null)).toBeNull();
  });

  it('invalidates older tokens after a newer begin', () => {
    const gate = createAssignmentLoadGate();
    const first = gate.begin('sec-a::null');
    const second = gate.begin('sec-b::math');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(gate.isCurrent(first!)).toBe(false);
    expect(gate.isCurrent(second!)).toBe(true);
  });
});
