import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageRepository, ManageService } from './manage.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import type { PacingService } from '../pacing/pacing.service';

describe('ManageService', () => {
  let service: ManageService;
  let repository: {
    listSettlingSteps: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    listTeacherSections: ReturnType<typeof vi.fn>;
    findTodayLessonDraft: ReturnType<typeof vi.fn>;
    findChild: ReturnType<typeof vi.fn>;
    listAbsentDays: ReturnType<typeof vi.fn>;
    listDoneProgress: ReturnType<typeof vi.fn>;
    listSliceThemes: ReturnType<typeof vi.fn>;
    listFestivalClosures: ReturnType<typeof vi.fn>;
    listFestivalClosuresBySchool: ReturnType<typeof vi.fn>;
    listSectionIds: ReturnType<typeof vi.fn>;
  };
  let pacing: { getPacing: ReturnType<typeof vi.fn> };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      listSettlingSteps: vi.fn().mockResolvedValue([
        { week_number: 1, title: 'Welcome', body: 'Routines' },
      ]),
      listChildren: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Priya', roll_number: '1' }]),
      listTeacherSections: vi.fn().mockResolvedValue([{ teacher_id: 't1', is_class_teacher: true }]),
      findTodayLessonDraft: vi.fn().mockResolvedValue({ day: '2025-04-15', draft: null, themes: [] }),
      findChild: vi.fn().mockResolvedValue({ id: 'c1', name: 'Priya', section_id: 's1' }),
      listAbsentDays: vi.fn().mockResolvedValue(['2025-04-15']),
      listDoneProgress: vi.fn().mockResolvedValue([{ map_slice_id: 'ms1' }]),
      listSliceThemes: vi.fn().mockResolvedValue([{ id: 'ms1', theme_or_chapter: 'Me and my family' }]),
      listFestivalClosures: vi.fn().mockResolvedValue([
        { id: 'cl1', name: 'Dashain', start_date: '2025-10-01', end_date: '2025-10-10' },
      ]),
      listFestivalClosuresBySchool: vi.fn().mockResolvedValue([
        { id: 'cl1', name: 'Dashain', start_date: '2025-10-01', end_date: '2025-10-10' },
      ]),
      listSectionIds: vi.fn().mockResolvedValue(['s1']),
    };
    pacing = { getPacing: vi.fn().mockResolvedValue({ state: 'behind', gapTeachingDays: 3 }) };
    ai = { orchestrate: vi.fn().mockResolvedValue({ text: 'Re-teach family theme with photos.' }) };
    service = new ManageService(
      repository as unknown as ManageRepository,
      pacing as unknown as PacingService,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('returns settling programme steps from config', async () => {
    const result = await service.getSettlingProgramme('band-1');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].title).toBe('Welcome');
  });

  it('assembles substitute pack without writing outcomes', async () => {
    const pack = await service.getSubstitutePack('s1');
    expect(pack.roster).toHaveLength(1);
    expect(pack.note).toMatch(/SubstituteRoleGuard/);
  });

  it('generates catch-up reteach without writing student_outcomes', async () => {
    const pack = await service.getCatchUpPack('s1', 'c1', 'band-1');
    expect(pack.missedThemes).toContain('Me and my family');
    expect(ai.orchestrate).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'catch_up_reteach' }),
    );
    // Cacheable feature must stay child-agnostic (no cross-tenant first-name leak).
    const [orchestrateInput] = ai.orchestrate.mock.calls[0];
    expect(orchestrateInput.variables).not.toHaveProperty('child_name');
  });

  it('joins festival closures with pacing state', async () => {
    const plan = await service.getFestivalPlanner('s1');
    expect(plan.pacingState).toBe('behind');
    expect(plan.festivals[0].name).toBe('Dashain');
  });

  it('admin festival planner uses school id without teacher scope', async () => {
    repository.listSectionIds.mockResolvedValue(['s1', 's2']);
    pacing.getPacing
      .mockResolvedValueOnce({ state: 'behind', gapTeachingDays: 3 })
      .mockResolvedValueOnce({ state: 'on_track', gapTeachingDays: 0 });
    const plan = await service.getAdminFestivalPlanner('school-1');
    expect(plan.sectionsBehindCount).toBe(1);
    expect(plan.sectionsTotal).toBe(2);
    expect(plan.festivals[0].name).toBe('Dashain');
  });
});
