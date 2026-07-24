import { describe, expect, it } from 'vitest';
import { annexAreaAchievement } from './area-achievement';

describe('annexAreaAchievement (I6–I8)', () => {
  const codes = ['ENG4.U1.1', 'ENG4.U1.2', 'ENG4.U1.3', 'ENG4.U1.4'];

  it('withholds partial area percentage and names missing indicators', () => {
    const result = annexAreaAchievement(4, codes, [
      { indicatorCode: 'ENG4.U1.1', rating: 3, state: 'confirmed' },
    ]);
    expect(result.status).toBe('withheld');
    if (result.status === 'withheld') {
      expect(result.missingIndicators).toEqual([
        'ENG4.U1.2',
        'ENG4.U1.3',
        'ENG4.U1.4',
      ]);
      expect(result.formulaFooter).toMatch(/Withheld/);
      expect(result.formulaFooter).toMatch(/4×4/);
    }
  });

  it('uses annex N as denominator when complete', () => {
    const result = annexAreaAchievement(
      4,
      codes,
      codes.map((indicatorCode) => ({
        indicatorCode,
        rating: 3,
        state: 'confirmed',
      })),
    );
    expect(result.status).toBe('computed');
    if (result.status === 'computed') {
      expect(result.denominator).toBe(16);
      expect(result.percent).toBe(75);
      expect(result.formulaFooter).toMatch(/4 × 4/);
    }
  });
});
