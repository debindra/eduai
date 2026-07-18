/**
 * Deterministic yearly-map placement — no AI.
 * Distributes theme sequence across teaching days with a consolidation window
 * at terminal close.
 */

export interface ThemeWeight {
  theme: string;
  outcomeId: string;
  /** Relative weight among content themes (consolidation is separate). */
  weight: number;
}

export interface PlacementInput {
  terminalId: string;
  teachingDayIndices: number[];
  themes: ThemeWeight[];
  /** Fraction of days reserved at end for consolidation (default 0.10). */
  consolidationFraction?: number;
  consolidationTheme?: ThemeWeight;
}

export interface PlacedSlice {
  terminalId: string;
  teachingDayIndex: number;
  themeOrChapter: string;
  outcomeId: string;
  isConsolidation: boolean;
}

export function placeThemesOnTeachingDays(input: PlacementInput): PlacedSlice[] {
  const days = [...input.teachingDayIndices].sort((a, b) => a - b);
  if (days.length === 0) return [];

  const fraction = input.consolidationFraction ?? 0.1;
  const consolCount = Math.max(3, Math.min(7, Math.floor(days.length * fraction)));
  const contentCount = Math.max(0, days.length - consolCount);
  const consolTheme =
    input.consolidationTheme ??
    input.themes[input.themes.length - 1] ?? {
      theme: 'Consolidation',
      outcomeId: '',
      weight: 1,
    };

  const contentThemes = input.themes.filter((t) => t.theme !== consolTheme.theme);
  const themes = contentThemes.length > 0 ? contentThemes : input.themes.slice(0, -1);
  const totalWeight = themes.reduce((sum, t) => sum + t.weight, 0) || 1;

  const result: PlacedSlice[] = [];
  for (let i = 0; i < days.length; i++) {
    const dayIndex = days[i]!;
    if (i >= contentCount) {
      result.push({
        terminalId: input.terminalId,
        teachingDayIndex: dayIndex,
        themeOrChapter: consolTheme.theme,
        outcomeId: consolTheme.outcomeId,
        isConsolidation: true,
      });
      continue;
    }

    const progress = contentCount === 1 ? 0 : i / contentCount;
    let acc = 0;
    let chosen = themes[themes.length - 1]!;
    for (const theme of themes) {
      acc += theme.weight / totalWeight;
      if (progress < acc) {
        chosen = theme;
        break;
      }
    }

    result.push({
      terminalId: input.terminalId,
      teachingDayIndex: dayIndex,
      themeOrChapter: chosen.theme,
      outcomeId: chosen.outcomeId,
      isConsolidation: false,
    });
  }

  return result;
}

/** Default School X theme bank (placeholder content). */
export const DEFAULT_PRE_PRIMARY_THEMES: ThemeWeight[] = [
  { theme: 'Myself and my family', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc01', weight: 1 },
  { theme: 'My school', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc02', weight: 1 },
  { theme: 'Animals around us', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc03', weight: 1 },
  { theme: 'Plants and gardens', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc04', weight: 1 },
  { theme: 'Food we eat', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc05', weight: 1 },
  { theme: 'Weather and seasons', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc06', weight: 1 },
  { theme: 'Community helpers', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc07', weight: 1 },
  { theme: 'Transport', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc08', weight: 1 },
  { theme: 'Numbers and patterns', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc09', weight: 1 },
  { theme: 'Letters and sounds', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc0a', weight: 1 },
  { theme: 'Stories and songs', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccc0b', weight: 1 },
  { theme: 'Consolidation', outcomeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', weight: 1 },
];
