import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_PRE_PRIMARY_THEMES,
  placeThemesOnTeachingDays,
} from './placement';
import { YearlyMapRepository } from './yearly-map.repository';

@Injectable()
export class YearlyMapService {
  constructor(private readonly repository: YearlyMapRepository) {}

  async getMap(sectionId: string) {
    const map = await this.repository.findMapForSection(sectionId);
    if (!map) throw new NotFoundException('No yearly map for section');
    const slices = await this.repository.listSlices(map.id);
    return {
      id: map.id as string,
      status: map.status as string,
      schoolCalendarId: map.school_calendar_id as string,
      sectionId: map.section_id as string,
      slices: slices.map((s) => ({
        id: s.id as string,
        terminalId: s.terminal_id as string,
        teachingDayIndex: s.teaching_day_index as number,
        themeOrChapter: s.theme_or_chapter as string | null,
        outcomeRefs: (s.outcome_refs as string[]) ?? [],
      })),
    };
  }

  /** Regenerate slices from live teaching_days — deterministic, no AI. */
  async regenerate(sectionId: string) {
    let map = await this.repository.findMapForSection(sectionId);
    if (!map) {
      throw new NotFoundException('No yearly map for section — create a draft first');
    }

    const calendarId = map.school_calendar_id as string;
    const teachingDays = await this.repository.listTeachingDays(calendarId);
    const byTerminal = new Map<string, number[]>();
    for (const row of teachingDays) {
      const tid = row.terminal_id as string;
      const list = byTerminal.get(tid) ?? [];
      list.push(row.day_index as number);
      byTerminal.set(tid, list);
    }

    await this.repository.deleteSlices(map.id as string);

    const insertRows: Array<{
      yearly_map_id: string;
      terminal_id: string;
      teaching_day_index: number;
      theme_or_chapter: string;
      outcome_refs: string[];
    }> = [];

    for (const [terminalId, indices] of byTerminal) {
      const placed = placeThemesOnTeachingDays({
        terminalId,
        teachingDayIndices: indices,
        themes: DEFAULT_PRE_PRIMARY_THEMES,
      });
      for (const slice of placed) {
        insertRows.push({
          yearly_map_id: map.id as string,
          terminal_id: slice.terminalId,
          teaching_day_index: slice.teachingDayIndex,
          theme_or_chapter: slice.themeOrChapter,
          outcome_refs: slice.outcomeId ? [slice.outcomeId] : [],
        });
      }
    }

    const inserted = await this.repository.insertSlices(insertRows);
    const outcomeRows = inserted
      .filter((s) => (s.outcome_refs as string[])?.length)
      .map((s) => ({
        map_slice_id: s.id as string,
        outcome_id: (s.outcome_refs as string[])[0]!,
      }));
    await this.repository.insertSliceOutcomes(outcomeRows);

    return this.getMap(sectionId);
  }

  async approve(sectionId: string) {
    const map = await this.repository.findMapForSection(sectionId);
    if (!map) throw new NotFoundException('No yearly map for section');
    const approved = await this.repository.approveMap(map.id as string);
    return {
      id: approved.id as string,
      status: approved.status as string,
    };
  }
}
