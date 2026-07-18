import { describe, expect, it } from 'vitest';
import { CommunityService } from './community.service';

describe('CommunityService', () => {
  it('returns a non-empty moments library', () => {
    const service = new CommunityService();
    const result = service.getMoments();
    expect(result.moments.length).toBeGreaterThan(0);
    expect(result.moments[0]).toHaveProperty('title');
    expect(result.moments[0]).toHaveProperty('method');
  });

  it('never leaks child-identifiable fields', () => {
    const service = new CommunityService();
    const json = JSON.stringify(service.getMoments());
    expect(json).not.toMatch(/childId|child_name|rollNumber|roll_number|rating/i);
  });
});
