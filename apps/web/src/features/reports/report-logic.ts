export function reportUiBranch(thinData: boolean): 'fallback' | 'draft' {
  return thinData ? 'fallback' : 'draft';
}
