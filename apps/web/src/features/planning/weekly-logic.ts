export function mergeWeeklyOverride(
  baseTheme: string | null,
  overrideTheme: string | null | undefined,
): string | null {
  return overrideTheme ?? baseTheme;
}
