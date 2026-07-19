import { describe, expect, it } from 'vitest';
import './timezone';

describe('process timezone', () => {
  it('uses Asia/Kathmandu (Nepal Standard Time, UTC+5:45)', () => {
    expect(process.env.TZ).toBe('Asia/Kathmandu');
    // getTimezoneOffset is minutes west of UTC; NPT is 345 minutes east.
    expect(new Date().getTimezoneOffset()).toBe(-345);
  });
});
