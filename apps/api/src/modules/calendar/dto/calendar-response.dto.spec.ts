import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PatchFestivalTemplateDto } from './calendar-response.dto';

describe('PatchFestivalTemplateDto', () => {
  it('accepts seed-style closure ids in UUID shape', async () => {
    const dto = plainToInstance(PatchFestivalTemplateDto, {
      closures: [
        {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbc1',
          name: 'Dashain',
          startDate: '2025-10-02',
          endDate: '2025-10-12',
          category: 'school_holiday',
        },
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc2',
          name: 'Tihar',
          startDate: '2025-10-20',
          endDate: '2025-10-24',
          category: 'school_holiday',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects malformed closure ids', async () => {
    const dto = plainToInstance(PatchFestivalTemplateDto, {
      closures: [
        {
          id: 'not-a-uuid',
          name: 'Dashain',
          startDate: '2025-10-02',
          endDate: '2025-10-12',
          category: 'school_holiday',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('closures');
  });
});
