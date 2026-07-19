import { describe, expect, it } from 'vitest';
import { iconGlyph, isEcaCcaIconKey } from './eca-cca-icons';
import {
  activePickerItems,
  catalogAvailableToEnable,
  catalogFormValid,
  draftFromActivity,
  type CatalogItem,
  type SchoolEcaCcaItem,
} from './eca-cca-logic';

const catalog: CatalogItem[] = [
  {
    id: 'c1',
    name: 'Sports',
    kind: 'eca',
    iconKey: 'sports',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'c2',
    name: 'Music',
    kind: 'cca',
    iconKey: 'music',
    sortOrder: 2,
    isActive: true,
  },
];

const schoolItems: SchoolEcaCcaItem[] = [
  {
    id: 's1',
    schoolId: 'school',
    catalogId: 'c1',
    name: 'Sports',
    kind: 'eca',
    iconKey: 'sports',
    isActive: true,
    isSchoolOnly: false,
  },
  {
    id: 's2',
    schoolId: 'school',
    catalogId: null,
    name: 'House',
    kind: 'eca',
    iconKey: 'sports',
    isActive: true,
    isSchoolOnly: true,
  },
  {
    id: 's3',
    schoolId: 'school',
    catalogId: 'c2',
    name: 'Music',
    kind: 'cca',
    iconKey: 'music',
    isActive: false,
    isSchoolOnly: false,
  },
];

describe('eca-cca-logic', () => {
  it('lists catalog rows not yet enabled', () => {
    expect(catalogAvailableToEnable(catalog, schoolItems).map((c) => c.id)).toEqual([
      'c2',
    ]);
  });

  it('activePickerItems excludes inactive', () => {
    expect(activePickerItems(schoolItems).map((i) => i.id)).toEqual(['s1', 's2']);
  });

  it('draftFromActivity maps picker selection', () => {
    expect(draftFromActivity(schoolItems[1]!)).toEqual({
      name: 'House',
      category: 'eca',
      schoolActivityId: 's2',
      iconKey: 'sports',
    });
  });

  it('validates catalog form', () => {
    expect(catalogFormValid({ name: 'X', kind: 'eca', iconKey: 'sports' })).toBe(true);
    expect(catalogFormValid({ name: '', kind: 'eca', iconKey: 'sports' })).toBe(false);
  });

  it('maps icon keys to glyphs', () => {
    expect(isEcaCcaIconKey('sports')).toBe(true);
    expect(isEcaCcaIconKey('nope')).toBe(false);
    expect(iconGlyph('music')).toBe('Music');
    expect(iconGlyph(null)).toBe('ECA');
  });
});
