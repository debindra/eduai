export interface FestivalPlannerShape {
  sectionId: string;
  pacingState: string;
  gapTeachingDays: number;
  festivals: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export interface AdminFestivalPlannerShape {
  schoolId: string;
  sectionsBehindCount: number;
  sectionsTotal: number;
  festivals: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export interface SettlingProgrammeShape {
  bandId: string;
  steps: Array<{ weekNumber: number; title: string; body: string }>;
}

export function festivalHeadline(plan: FestivalPlannerShape): string {
  if (plan.festivals.length === 0) return 'No upcoming festival closures';
  return `${plan.festivals.length} festival(s) · pacing ${plan.pacingState}`;
}

export function adminFestivalHeadline(plan: AdminFestivalPlannerShape): string {
  if (plan.festivals.length === 0) {
    return `No festival closures · ${plan.sectionsBehindCount}/${plan.sectionsTotal} sections behind`;
  }
  return `${plan.festivals.length} festival(s) · ${plan.sectionsBehindCount}/${plan.sectionsTotal} sections behind`;
}
