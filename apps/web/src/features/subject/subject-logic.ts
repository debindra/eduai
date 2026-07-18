export interface SubjectViewShape {
  sectionId: string;
  subjectId: string;
  subjectName: string | null;
  writeScope: string;
  hasWriteGrain: boolean;
  outcomes: Array<{ id: string; code: string; statement: string }>;
  children: Array<{ id: string; name: string; rollNumber: string }>;
  confirmedCount: number;
  confirmed: Array<{
    id: string;
    childId: string;
    outcomeId: string;
    ratingCode: string;
    attempt: string;
  }>;
}

export interface OversightShape {
  sectionId: string;
  sectionName: string;
  grade: string;
  children: Array<{
    childId: string;
    name: string;
    rollNumber: string;
    letterCode: string | null;
    percent: number | null;
  }>;
}

export function subjectViewHeadline(view: SubjectViewShape): string {
  return `${view.subjectName ?? 'Subject'} · ${view.confirmedCount} confirmed · ${view.children.length} children`;
}

export function oversightHeadline(view: OversightShape): string {
  const withLetter = view.children.filter((c) => c.letterCode).length;
  return `${view.sectionName} · ${withLetter}/${view.children.length} with letter grade`;
}
