import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import { EcaCcaService } from './eca-cca.service';
import { isEcaCcaIconKey } from './eca-cca-icons';

describe('eca-cca-icons', () => {
  it('allowlists known keys only', () => {
    expect(isEcaCcaIconKey('sports')).toBe(true);
    expect(isEcaCcaIconKey('nope')).toBe(false);
  });
});

describe('EcaCcaService', () => {
  let service: EcaCcaService;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    from = vi.fn();
    service = new EcaCcaService({
      getClient: () => ({ from }),
    } as unknown as SupabaseService);
  });

  it('rejects unknown icon_key before touching the database', async () => {
    await expect(
      service.createCatalogItem({
        name: 'Bad',
        kind: 'eca',
        iconKey: 'not-an-icon' as 'sports',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects school-only field edits on catalog-backed rows', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'i1',
        school_id: 's1',
        catalog_id: 'c1',
        name: null,
        kind: null,
        icon_key: null,
        is_active: true,
        deleted_at: null,
      },
      error: null,
    });
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle }),
          }),
        }),
      }),
    });
    await expect(
      service.updateSchoolOnlyItem('s1', 'i1', { name: 'Nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('softDeleteCatalogItem throws NotFound when missing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    from.mockReturnValue({
      update: () => ({
        eq: () => ({
          is: () => ({
            select: () => ({ maybeSingle }),
          }),
        }),
      }),
    });
    await expect(service.softDeleteCatalogItem('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolveActiveSchoolItem rejects inactive items', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'i1',
        school_id: 's1',
        catalog_id: null,
        name: 'House',
        kind: 'eca',
        icon_key: 'sports',
        is_active: false,
        deleted_at: null,
      },
      error: null,
    });
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({ maybeSingle }),
          }),
        }),
      }),
    });
    await expect(service.resolveActiveSchoolItem('s1', 'i1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
