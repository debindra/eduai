import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RosterController } from './roster.controller';
import type { RosterService } from './roster.service';

describe('RosterController', () => {
  let controller: RosterController;
  let rosterService: {
    listSections: ReturnType<typeof vi.fn>;
    createSection: ReturnType<typeof vi.fn>;
    updateSection: ReturnType<typeof vi.fn>;
    deleteSection: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    createChild: ReturnType<typeof vi.fn>;
    updateChild: ReturnType<typeof vi.fn>;
    updateChildStatus: ReturnType<typeof vi.fn>;
    listTeacherSections: ReturnType<typeof vi.fn>;
    createTeacherSection: ReturnType<typeof vi.fn>;
    updateTeacherSection: ReturnType<typeof vi.fn>;
    deleteTeacherSection: ReturnType<typeof vi.fn>;
    listTeachers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rosterService = {
      listSections: vi.fn(),
      createSection: vi.fn(),
      updateSection: vi.fn(),
      deleteSection: vi.fn(),
      listChildren: vi.fn(),
      createChild: vi.fn(),
      updateChild: vi.fn(),
      updateChildStatus: vi.fn(),
      listTeacherSections: vi.fn(),
      createTeacherSection: vi.fn(),
      updateTeacherSection: vi.fn(),
      deleteTeacherSection: vi.fn(),
      listTeachers: vi.fn(),
    };
    controller = new RosterController(rosterService as unknown as RosterService);
  });

  it('GET sections delegates to listSections', async () => {
    rosterService.listSections.mockResolvedValue([{ id: 's1' }]);
    const actual = await controller.listSections('school-1');
    expect(rosterService.listSections).toHaveBeenCalledWith('school-1');
    expect(actual).toEqual([{ id: 's1' }]);
  });

  it('POST sections delegates to createSection', async () => {
    const dto = { name: 'Nursery A', bandId: 'band-1' };
    rosterService.createSection.mockResolvedValue({ id: 's1', ...dto });
    const actual = await controller.createSection('school-1', dto);
    expect(rosterService.createSection).toHaveBeenCalledWith('school-1', dto);
    expect(actual.id).toBe('s1');
  });

  it('DELETE sections delegates to deleteSection', async () => {
    rosterService.deleteSection.mockResolvedValue({ deleted: true, sectionId: 's1' });
    const actual = await controller.deleteSection('school-1', 's1');
    expect(rosterService.deleteSection).toHaveBeenCalledWith('school-1', 's1');
    expect(actual.deleted).toBe(true);
  });

  it('POST children delegates to createChild', async () => {
    const dto = { sectionId: 's1', name: 'Aarav', rollNumber: '1' };
    rosterService.createChild.mockResolvedValue({ id: 'c1', ...dto });
    const actual = await controller.createChild('school-1', dto);
    expect(rosterService.createChild).toHaveBeenCalledWith('school-1', dto);
    expect(actual.id).toBe('c1');
  });

  it('PATCH children/:id/status delegates to updateChildStatus', async () => {
    rosterService.updateChildStatus.mockResolvedValue({
      id: 'c1',
      status: 'exited',
    });
    const actual = await controller.updateChildStatus('school-1', 'c1', {
      status: 'exited',
    });
    expect(rosterService.updateChildStatus).toHaveBeenCalledWith('school-1', 'c1', {
      status: 'exited',
    });
    expect(actual.status).toBe('exited');
  });

  it('POST teacher-sections delegates to createTeacherSection', async () => {
    const dto = {
      teacherId: 't1',
      sectionId: 's1',
      subjectId: null as string | null,
      isClassTeacher: true,
    };
    rosterService.createTeacherSection.mockResolvedValue({ id: 'ts1', ...dto });
    const actual = await controller.createTeacherSection('school-1', dto);
    expect(rosterService.createTeacherSection).toHaveBeenCalledWith('school-1', dto);
    expect(actual.id).toBe('ts1');
  });

  it('GET teachers delegates to listTeachers', async () => {
    rosterService.listTeachers.mockResolvedValue([{ teacherId: 't1' }]);
    const actual = await controller.listTeachers('school-1');
    expect(rosterService.listTeachers).toHaveBeenCalledWith('school-1');
    expect(actual).toEqual([{ teacherId: 't1' }]);
  });
});
