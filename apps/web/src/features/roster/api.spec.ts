import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../lib/shared/stores/session', () => ({
  getSession: vi.fn(),
}));

import { apiFetch } from '../../lib/shared/api/client';
import { getSession } from '../../lib/shared/stores/session';
import {
  createChild,
  createSection,
  inviteTeacher,
  listBands,
  listSections,
  listTeachers,
} from './api';

const mockApiFetch = vi.mocked(apiFetch);
const mockGetSession = vi.mocked(getSession);

describe('roster api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockReturnValue({
      accessToken: 'token-1',
      identity: {
        id: 'identity-1',
        email: 'admin@schoolx.dev',
        phone: null,
        displayName: 'Admin',
      },
      memberType: 'admin',
      schoolId: 'school-1',
    });
  });

  it('listSections uses school-scoped path', async () => {
    mockApiFetch.mockResolvedValue([]);
    await listSections();
    expect(mockApiFetch).toHaveBeenCalledWith('/schools/school-1/sections');
  });

  it('createSection posts to school sections', async () => {
    mockApiFetch.mockResolvedValue({
      id: 's1',
      schoolId: 'school-1',
      bandId: 'band-1',
      grade: 'Nursery',
      name: 'Nursery A',
    });
    const payload = { name: 'Nursery A', bandId: 'band-1', grade: 'Nursery' };
    await createSection(payload);
    expect(mockApiFetch).toHaveBeenCalledWith('/schools/school-1/sections', {
      method: 'POST',
      body: payload,
    });
  });

  it('createChild posts to school children', async () => {
    mockApiFetch.mockResolvedValue({
      id: 'c1',
      sectionId: 's1',
      name: 'Aarav',
      rollNumber: '1',
      dob: null,
      status: 'active',
      reportLanguageOverride: null,
      accessNote: null,
    });
    await createChild({ sectionId: 's1', name: 'Aarav', rollNumber: '1' });
    expect(mockApiFetch).toHaveBeenCalledWith('/schools/school-1/children', {
      method: 'POST',
      body: { sectionId: 's1', name: 'Aarav', rollNumber: '1' },
    });
  });

  it('listTeachers uses school-scoped path', async () => {
    mockApiFetch.mockResolvedValue([]);
    await listTeachers();
    expect(mockApiFetch).toHaveBeenCalledWith('/schools/school-1/teachers');
  });

  it('listBands unwraps bands array', async () => {
    mockApiFetch.mockResolvedValue({
      bands: [{ id: 'b1', code: 'pre_primary', nameEn: 'Pre-primary', subjects: [] }],
    });
    const bands = await listBands();
    expect(bands).toHaveLength(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/bands');
  });

  it('inviteTeacher posts to /auth/invite with schoolId', async () => {
    mockApiFetch.mockResolvedValue({ identityId: 'i1', delivery: 'email' });
    await inviteTeacher({ email: 't@schoolx.dev', displayName: 'Teacher' });
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/invite', {
      method: 'POST',
      body: {
        schoolId: 'school-1',
        memberType: 'teacher',
        email: 't@schoolx.dev',
        phone: undefined,
        displayName: 'Teacher',
      },
    });
  });

  it('throws when session has no schoolId', async () => {
    mockGetSession.mockReturnValue(null);
    await expect(listSections()).rejects.toThrow(/school context missing/);
  });
});
