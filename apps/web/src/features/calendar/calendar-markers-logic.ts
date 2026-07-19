/**
 * Pure helpers: expand closure date ranges into NepaliCalendar markedDates.
 */

export type MarkerTone = 'red' | 'amber' | 'violet' | 'green';

/** Single UI label for ECA and CCA (same marker type / green tone). */
export const ECA_CCA_LABEL = 'ECA (Extra Curricular)/CCA (Co-Curricular)';

export type ClosureMarkerInput = {
  name: string;
  startDate: string;
  endDate: string;
  /** National or school category driving tone. */
  category?: string;
  /** Optional ECA/CCA icon key — prefixed on the marker label when set. */
  iconKey?: string | null;
};

/** Prefix activity icon label onto a closure display name. */
export function closureDisplayName(name: string, iconKey?: string | null): string {
  if (!iconKey) return name;
  // Short bracket tag; glyph mapping lives in eca-cca-icons (avoid circular imports).
  return `[${iconKey}] ${name}`;
}

/** ISO weekdays (1=Mon … 7=Sun) matching school_calendars.weekly_offs / teaching_days. */
export type WeeklyOffMarkerInput = {
  sessionStart: string;
  sessionEnd: string;
  isoWeekdays: number[];
};

export type DateMarker = {
  label: string;
  tone: MarkerTone;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ISO_WEEKDAY_LABEL: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

const TONE_PRIORITY: Record<MarkerTone, number> = {
  red: 4,
  amber: 3,
  violet: 2,
  green: 1,
};

/** Inclusive AD ISO day list (UTC arithmetic — dates are calendar days, not instants). */
export function enumerateInclusiveDates(startDate: string, endDate: string): string[] {
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    return [];
  }
  const start = Date.parse(`${startDate}T12:00:00.000Z`);
  const end = Date.parse(`${endDate}T12:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return [];
  }
  const days: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

export function toneForCategory(category: string | undefined): MarkerTone {
  switch (category) {
    case 'govt_holiday':
    case 'day_off':
      return 'red';
    case 'festival':
      return 'amber';
    case 'school_holiday':
      return 'violet';
    case 'eca':
    case 'cca':
      return 'green';
    default:
      return 'violet';
  }
}

/** Human-readable category for legends, dialogs, and copy. */
export function closureCategoryLabel(category: string | undefined): string {
  switch (category) {
    case 'eca':
    case 'cca':
      return ECA_CCA_LABEL;
    case 'school_holiday':
      return 'School holiday';
    case 'govt_holiday':
      return 'Government holiday';
    case 'festival':
      return 'Festival';
    case 'day_off':
      return 'Day off';
    default:
      return category && category.length > 0 ? category : '—';
  }
}

function dominantTone(a: MarkerTone, b: MarkerTone): MarkerTone {
  return TONE_PRIORITY[a] >= TONE_PRIORITY[b] ? a : b;
}

/** UTC noon ISO weekday (1=Mon … 7=Sun) for a calendar AD date. */
export function isoWeekdayForAdDate(adIso: string): number | null {
  if (!ISO_DATE.test(adIso)) return null;
  const t = Date.parse(`${adIso}T12:00:00.000Z`);
  if (Number.isNaN(t)) return null;
  const jsDay = new Date(t).getUTCDay(); // 0=Sun … 6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

/** Session days whose ISO weekday is in weeklyOffs (same rule as teaching_days VIEW). */
export function enumerateWeeklyOffDates(
  sessionStart: string,
  sessionEnd: string,
  isoWeekdays: number[],
): string[] {
  const offs = new Set(isoWeekdays.filter((d) => d >= 1 && d <= 7));
  if (offs.size === 0) return [];
  return enumerateInclusiveDates(sessionStart, sessionEnd).filter((day) => {
    const dow = isoWeekdayForAdDate(day);
    return dow !== null && offs.has(dow);
  });
}

export function weeklyOffLegendLabel(isoWeekdays: number[]): string {
  const labels = [...new Set(isoWeekdays.filter((d) => d >= 1 && d <= 7))]
    .sort((a, b) => a - b)
    .map((d) => ISO_WEEKDAY_LABEL[d])
    .filter(Boolean);
  if (labels.length === 0) return 'Weekly offs';
  return `Weekly offs (${labels.join(', ')})`;
}

/**
 * Build markedDates map for NepaliCalendar.
 * Overlapping labels are joined; tone is the highest-priority category present.
 * Priority: national red > national amber > local violet > local green.
 * Weekly offs are a red base layer (same tone as day_off); named closures override labels.
 */
export function buildMarkedDates(
  national: ClosureMarkerInput[],
  local: ClosureMarkerInput[] = [],
  weeklyOffs?: WeeklyOffMarkerInput | null,
): Record<string, DateMarker> {
  const marked: Record<string, DateMarker> = {};
  if (weeklyOffs) {
    for (const day of enumerateWeeklyOffDates(
      weeklyOffs.sessionStart,
      weeklyOffs.sessionEnd,
      weeklyOffs.isoWeekdays,
    )) {
      marked[day] = { label: 'Weekly off', tone: 'red' };
    }
  }
  const apply = (closures: ClosureMarkerInput[]) => {
    for (const closure of closures) {
      if (!closure.name || !closure.startDate || !closure.endDate) continue;
      const tone = toneForCategory(closure.category);
      const label = closureDisplayName(closure.name, closure.iconKey);
      for (const day of enumerateInclusiveDates(closure.startDate, closure.endDate)) {
        const existing = marked[day];
        if (!existing) {
          marked[day] = { label, tone };
        } else if (existing.label === 'Weekly off') {
          // Named closure replaces the generic weekly-off label; keep dominant tone.
          marked[day] = {
            label,
            tone: dominantTone(existing.tone, tone),
          };
        } else {
          marked[day] = {
            label: `${existing.label}; ${label}`,
            tone: dominantTone(existing.tone, tone),
          };
        }
      }
    }
  };
  apply(local);
  apply(national);
  return marked;
}

export type LegendItem = {
  name: string;
  startDate: string;
  endDate: string;
  source: 'national' | 'local' | 'weekly';
  category?: string;
  tone: MarkerTone;
};

export function closureLegendItems(
  national: ClosureMarkerInput[],
  local: ClosureMarkerInput[] = [],
  weeklyOffs?: WeeklyOffMarkerInput | null,
): LegendItem[] {
  const items: LegendItem[] = [];
  if (weeklyOffs && weeklyOffs.isoWeekdays.some((d) => d >= 1 && d <= 7)) {
    items.push({
      name: weeklyOffLegendLabel(weeklyOffs.isoWeekdays),
      startDate: weeklyOffs.sessionStart,
      endDate: weeklyOffs.sessionEnd,
      source: 'weekly',
      category: 'day_off',
      tone: 'red',
    });
  }
  items.push(
    ...national
      .filter((c) => c.name && c.startDate && c.endDate)
      .map((c) => ({
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        source: 'national' as const,
        category: c.category,
        tone: toneForCategory(c.category),
      })),
    ...local
      .filter((c) => c.name && c.startDate && c.endDate)
      .map((c) => ({
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        source: 'local' as const,
        category: c.category,
        tone: toneForCategory(c.category),
      })),
  );
  return items;
}

export function toneRingClass(tone: MarkerTone): string {
  switch (tone) {
    case 'red':
      return 'ring-1 ring-rose-400';
    case 'amber':
      return 'ring-1 ring-amber-300';
    case 'violet':
      return 'ring-1 ring-violet-400';
    case 'green':
      return 'ring-1 ring-emerald-400';
  }
}

export function toneLabelClass(tone: MarkerTone): string {
  switch (tone) {
    case 'red':
      return 'text-rose-700';
    case 'amber':
      return 'text-amber-700';
    case 'violet':
      return 'text-violet-700';
    case 'green':
      return 'text-emerald-700';
  }
}

export function toneBadgeClass(tone: MarkerTone): string {
  switch (tone) {
    case 'red':
      return 'bg-rose-100 text-rose-900';
    case 'amber':
      return 'bg-amber-100 text-amber-900';
    case 'violet':
      return 'bg-violet-100 text-violet-900';
    case 'green':
      return 'bg-emerald-100 text-emerald-900';
  }
}
