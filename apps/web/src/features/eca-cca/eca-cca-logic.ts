import type { EcaCcaIconKey, EcaCcaKind } from './eca-cca-icons';

export type CatalogItem = {
  id: string;
  name: string;
  kind: EcaCcaKind;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
};

export type SchoolEcaCcaItem = {
  id: string;
  schoolId: string;
  catalogId: string | null;
  name: string;
  kind: EcaCcaKind;
  iconKey: string;
  isActive: boolean;
  isSchoolOnly: boolean;
};

export type SchoolEcaCcaBundle = {
  catalog: CatalogItem[];
  schoolItems: SchoolEcaCcaItem[];
};

/** Catalog rows not yet enabled (active) for the school. */
export function catalogAvailableToEnable(
  catalog: CatalogItem[],
  schoolItems: SchoolEcaCcaItem[],
): CatalogItem[] {
  const enabledCatalogIds = new Set(
    schoolItems
      .filter((item) => item.catalogId && item.isActive && !item.isSchoolOnly)
      .map((item) => item.catalogId as string),
  );
  return catalog.filter((row) => row.isActive && !enabledCatalogIds.has(row.id));
}

/** Active school items for the calendar ECA/CCA picker. */
export function activePickerItems(schoolItems: SchoolEcaCcaItem[]): SchoolEcaCcaItem[] {
  return schoolItems.filter((item) => item.isActive);
}

export function draftFromActivity(item: SchoolEcaCcaItem): {
  name: string;
  category: EcaCcaKind;
  schoolActivityId: string;
  iconKey: string;
} {
  return {
    name: item.name,
    category: item.kind,
    schoolActivityId: item.id,
    iconKey: item.iconKey,
  };
}

export function catalogFormValid(input: {
  name: string;
  kind: string;
  iconKey: string;
}): boolean {
  return (
    input.name.trim().length > 0 &&
    (input.kind === 'eca' || input.kind === 'cca') &&
    input.iconKey.length > 0
  );
}

export type CatalogFormState = {
  name: string;
  kind: EcaCcaKind;
  iconKey: EcaCcaIconKey;
  sortOrder: number;
  isActive: boolean;
};
