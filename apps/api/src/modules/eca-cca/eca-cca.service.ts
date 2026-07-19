import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type {
  CreateCatalogItemDto,
  CreateSchoolOnlyItemDto,
  UpdateCatalogItemDto,
  UpdateSchoolOnlyItemDto,
} from './dto/eca-cca.dto';
import { isEcaCcaIconKey } from './eca-cca-icons';

type CatalogRow = {
  id: string;
  name: string;
  kind: 'eca' | 'cca';
  icon_key: string;
  sort_order: number;
  is_active: boolean;
  deleted_at: string | null;
};

type SchoolItemRow = {
  id: string;
  school_id: string;
  catalog_id: string | null;
  name: string | null;
  kind: 'eca' | 'cca' | null;
  icon_key: string | null;
  is_active: boolean;
  deleted_at: string | null;
};

/** Deterministic ECA/CCA catalog + school items — zero AI calls. */
@Injectable()
export class EcaCcaService {
  constructor(private readonly supabase: SupabaseService) {}

  // --- Platform catalog ----------------------------------------------------

  async listCatalog(opts?: { includeInactive?: boolean }) {
    const client = this.requireClient();
    let query = client
      .from('eca_cca_catalog')
      .select('id, name, kind, icon_key, sort_order, is_active, deleted_at')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (!opts?.includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { items: (data as CatalogRow[]).map((row) => this.mapCatalog(row)) };
  }

  async createCatalogItem(dto: CreateCatalogItemDto) {
    this.assertIcon(dto.iconKey);
    const client = this.requireClient();
    const { data, error } = await client
      .from('eca_cca_catalog')
      .insert({
        name: dto.name,
        kind: dto.kind,
        icon_key: dto.iconKey,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
      })
      .select('id, name, kind, icon_key, sort_order, is_active, deleted_at')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to create catalog item');
    }
    return this.mapCatalog(data as CatalogRow);
  }

  async updateCatalogItem(id: string, dto: UpdateCatalogItemDto) {
    if (dto.iconKey !== undefined) {
      this.assertIcon(dto.iconKey);
    }
    const client = this.requireClient();
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.kind !== undefined) patch.kind = dto.kind;
    if (dto.iconKey !== undefined) patch.icon_key = dto.iconKey;
    if (dto.sortOrder !== undefined) patch.sort_order = dto.sortOrder;
    if (dto.isActive !== undefined) patch.is_active = dto.isActive;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    const { data, error } = await client
      .from('eca_cca_catalog')
      .update(patch)
      .eq('id', id)
      .is('deleted_at', null)
      .select('id, name, kind, icon_key, sort_order, is_active, deleted_at')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Catalog item not found');
    }
    return this.mapCatalog(data as CatalogRow);
  }

  async softDeleteCatalogItem(id: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('eca_cca_catalog')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Catalog item not found');
    }
    return { id, deleted: true as const };
  }

  // --- School items --------------------------------------------------------

  async getSchoolBundle(schoolId: string) {
    const catalog = await this.listCatalog({ includeInactive: false });
    const schoolItems = await this.listSchoolItems(schoolId);
    return { catalog: catalog.items, schoolItems };
  }

  async listSchoolItems(schoolId: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const rows = (data as SchoolItemRow[]) ?? [];
    const catalogIds = rows
      .map((r) => r.catalog_id)
      .filter((id): id is string => Boolean(id));
    const catalogById = await this.loadCatalogByIds(catalogIds);
    return rows.map((row) => this.mapSchoolItem(row, catalogById));
  }

  async enableCatalogItem(schoolId: string, catalogId: string) {
    const catalog = await this.requireActiveCatalog(catalogId);
    const client = this.requireClient();
    const { data: existing } = await client
      .from('school_eca_cca_items')
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .eq('school_id', schoolId)
      .eq('catalog_id', catalogId)
      .maybeSingle();
    if (existing && !(existing as SchoolItemRow).deleted_at) {
      if (!(existing as SchoolItemRow).is_active) {
        const { data, error } = await client
          .from('school_eca_cca_items')
          .update({ is_active: true })
          .eq('id', (existing as SchoolItemRow).id)
          .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
          .single();
        if (error || !data) {
          throw new BadRequestException(error?.message ?? 'Failed to re-enable item');
        }
        return this.mapSchoolItem(data as SchoolItemRow, new Map([[catalog.id, catalog]]));
      }
      return this.mapSchoolItem(existing as SchoolItemRow, new Map([[catalog.id, catalog]]));
    }
    if (existing && (existing as SchoolItemRow).deleted_at) {
      const { data, error } = await client
        .from('school_eca_cca_items')
        .update({ deleted_at: null, is_active: true })
        .eq('id', (existing as SchoolItemRow).id)
        .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
        .single();
      if (error || !data) {
        throw new BadRequestException(error?.message ?? 'Failed to restore item');
      }
      return this.mapSchoolItem(data as SchoolItemRow, new Map([[catalog.id, catalog]]));
    }
    const { data, error } = await client
      .from('school_eca_cca_items')
      .insert({
        school_id: schoolId,
        catalog_id: catalogId,
        is_active: true,
      })
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to enable catalog item');
    }
    return this.mapSchoolItem(data as SchoolItemRow, new Map([[catalog.id, catalog]]));
  }

  async setSchoolItemActive(schoolId: string, itemId: string, isActive: boolean) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .update({ is_active: isActive })
      .eq('id', itemId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('School ECA/CCA item not found');
    }
    const row = data as SchoolItemRow;
    const catalogById = row.catalog_id
      ? await this.loadCatalogByIds([row.catalog_id])
      : new Map<string, CatalogRow>();
    return this.mapSchoolItem(row, catalogById);
  }

  async disableSchoolItem(schoolId: string, itemId: string) {
    return this.setSchoolItemActive(schoolId, itemId, false);
  }

  async createSchoolOnlyItem(schoolId: string, dto: CreateSchoolOnlyItemDto) {
    this.assertIcon(dto.iconKey);
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .insert({
        school_id: schoolId,
        catalog_id: null,
        name: dto.name,
        kind: dto.kind,
        icon_key: dto.iconKey,
        is_active: true,
      })
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to create school-only item');
    }
    return this.mapSchoolItem(data as SchoolItemRow, new Map());
  }

  async updateSchoolOnlyItem(
    schoolId: string,
    itemId: string,
    dto: UpdateSchoolOnlyItemDto,
  ) {
    if (dto.iconKey !== undefined) {
      this.assertIcon(dto.iconKey);
    }
    const existing = await this.requireSchoolItem(schoolId, itemId);
    if (existing.catalog_id) {
      throw new BadRequestException(
        'Cannot edit catalog-backed item fields; disable/enable the catalog row instead',
      );
    }
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.kind !== undefined) patch.kind = dto.kind;
    if (dto.iconKey !== undefined) patch.icon_key = dto.iconKey;
    if (dto.isActive !== undefined) patch.is_active = dto.isActive;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No fields to update');
    }
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .update(patch)
      .eq('id', itemId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to update school-only item');
    }
    return this.mapSchoolItem(data as SchoolItemRow, new Map());
  }

  async softDeleteSchoolItem(schoolId: string, itemId: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', itemId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('School ECA/CCA item not found');
    }
    return { id: itemId, deleted: true as const };
  }

  /**
   * Resolve an active school item for calendar linking.
   * Rejects cross-school IDs.
   */
  async resolveActiveSchoolItem(schoolId: string, itemId: string) {
    const item = await this.requireSchoolItem(schoolId, itemId);
    if (!item.is_active) {
      throw new BadRequestException('School ECA/CCA item is not active');
    }
    const catalogById = item.catalog_id
      ? await this.loadCatalogByIds([item.catalog_id])
      : new Map<string, CatalogRow>();
    return this.mapSchoolItem(item, catalogById);
  }

  // --- helpers -------------------------------------------------------------

  private async requireActiveCatalog(catalogId: string): Promise<CatalogRow> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('eca_cca_catalog')
      .select('id, name, kind, icon_key, sort_order, is_active, deleted_at')
      .eq('id', catalogId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Catalog item not found or inactive');
    }
    return data as CatalogRow;
  }

  private async requireSchoolItem(
    schoolId: string,
    itemId: string,
  ): Promise<SchoolItemRow> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('school_eca_cca_items')
      .select('id, school_id, catalog_id, name, kind, icon_key, is_active, deleted_at')
      .eq('id', itemId)
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('School ECA/CCA item not found');
    }
    return data as SchoolItemRow;
  }

  private async loadCatalogByIds(ids: string[]): Promise<Map<string, CatalogRow>> {
    const map = new Map<string, CatalogRow>();
    if (ids.length === 0) return map;
    const client = this.requireClient();
    const { data, error } = await client
      .from('eca_cca_catalog')
      .select('id, name, kind, icon_key, sort_order, is_active, deleted_at')
      .in('id', ids);
    if (error) {
      throw new BadRequestException(error.message);
    }
    for (const row of (data as CatalogRow[]) ?? []) {
      map.set(row.id, row);
    }
    return map;
  }

  private mapCatalog(row: CatalogRow) {
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      iconKey: row.icon_key,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    };
  }

  private mapSchoolItem(row: SchoolItemRow, catalogById: Map<string, CatalogRow>) {
    if (row.catalog_id) {
      const catalog = catalogById.get(row.catalog_id);
      if (!catalog) {
        throw new BadRequestException('Linked catalog item missing');
      }
      return {
        id: row.id,
        schoolId: row.school_id,
        catalogId: row.catalog_id,
        name: catalog.name,
        kind: catalog.kind,
        iconKey: catalog.icon_key,
        isActive: row.is_active,
        isSchoolOnly: false as const,
      };
    }
    return {
      id: row.id,
      schoolId: row.school_id,
      catalogId: null,
      name: row.name ?? '',
      kind: row.kind as 'eca' | 'cca',
      iconKey: row.icon_key ?? 'sports',
      isActive: row.is_active,
      isSchoolOnly: true as const,
    };
  }

  private assertIcon(iconKey: string): void {
    if (!isEcaCcaIconKey(iconKey)) {
      throw new BadRequestException(`Unknown icon_key: ${iconKey}`);
    }
  }

  private requireClient() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new BadRequestException('Database is not configured');
    }
    return client;
  }
}
