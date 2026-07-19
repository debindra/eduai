/** Fixed icon allowlist — must match API + DB CHECK. */
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

export const ECA_CCA_KINDS = ['eca', 'cca'] as const;
export type EcaCcaKind = (typeof ECA_CCA_KINDS)[number];

/** Short text labels for board + pickers (allowlist keys only; no emoji). */
export const ECA_CCA_ICON_LABELS: Record<EcaCcaIconKey, string> = {
  sports: 'Sports',
  music: 'Music',
  art: 'Art',
  dance: 'Dance',
  drama: 'Drama',
  scout: 'Scout',
  debate: 'Debate',
  science: 'Science',
  computer: 'Computer',
  yoga: 'Yoga',
  gardening: 'Garden',
  library: 'Library',
};

export function isEcaCcaIconKey(value: string): value is EcaCcaIconKey {
  return (ECA_CCA_ICON_KEYS as readonly string[]).includes(value);
}

export function iconGlyph(iconKey: string | null | undefined): string {
  if (iconKey && isEcaCcaIconKey(iconKey)) {
    return ECA_CCA_ICON_LABELS[iconKey];
  }
  return 'ECA';
}
