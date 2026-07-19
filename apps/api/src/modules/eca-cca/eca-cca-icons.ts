/** Fixed icon allowlist — must match DB CHECK on eca_cca_catalog / school_eca_cca_items. */
export const ECA_CCA_ICON_KEYS = [
  'sports',
  'music',
  'art',
  'dance',
  'drama',
  'scout',
  'debate',
  'science',
  'computer',
  'yoga',
  'gardening',
  'library',
] as const;

export type EcaCcaIconKey = (typeof ECA_CCA_ICON_KEYS)[number];

export function isEcaCcaIconKey(value: string): value is EcaCcaIconKey {
  return (ECA_CCA_ICON_KEYS as readonly string[]).includes(value);
}

export const ECA_CCA_KINDS = ['eca', 'cca'] as const;
export type EcaCcaKind = (typeof ECA_CCA_KINDS)[number];
