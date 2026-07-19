import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RosterPage from './RosterPage.svelte';

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/active', () => ({
  default: () => ({ destroy: () => {} }),
}));

vi.mock('@keenmate/svelte-spa-router/utils', () => ({
  push: vi.fn(),
}));

vi.mock('./api', () => ({
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
  listBands: vi.fn(),
  inviteTeacher: vi.fn(),
}));

import {
  createChild,
  createSection,
  inviteTeacher,
  listBands,
  listChildren,
  listSections,
  listTeacherSections,
  listTeachers,
} from './api';

describe('RosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listSections).mockResolvedValue([
      {
        id: 's1',
        schoolId: 'school-1',
        bandId: 'band-pp',
        grade: 'Nursery',
        name: 'Nursery A',
      },
    ]);
    vi.mocked(listChildren).mockResolvedValue([
      {
        id: 'c1',
        sectionId: 's1',
        name: 'Aarav',
        rollNumber: '12',
        dob: null,
        status: 'active',
        reportLanguageOverride: null,
        accessNote: null,
      },
    ]);
    vi.mocked(listTeacherSections).mockResolvedValue([]);
    vi.mocked(listTeachers).mockResolvedValue([
      {
        teacherId: 't1',
        identityId: 'i1',
        displayName: 'Maya',
        email: 'maya@schoolx.dev',
        phone: null,
        accountStatus: 'invited',
      },
    ]);
    vi.mocked(listBands).mockResolvedValue([
      {
        id: 'band-pp',
        code: 'pre_primary',
        nameEn: 'Pre-primary',
        nameNp: null,
        assessmentMode: 'three_state_narrative',
        aggregationRule: null,
        gradeRange: 'Nursery–UKG',
        subjects: [],
      },
    ]);
  });

  it('loads sections, children, and teachers', async () => {
    render(RosterPage);
    await waitFor(() => {
      expect(screen.getByTestId('section-list')).toHaveTextContent('Nursery A');
    });
    expect(screen.getByTestId('child-list')).toHaveTextContent('Aarav');
    expect(screen.getByTestId('teacher-list')).toHaveTextContent('Maya');
    expect(screen.getByTestId('teacher-list')).toHaveTextContent('Invited');
  });

  it('creates a section via the form', async () => {
    const user = userEvent.setup();
    vi.mocked(createSection).mockResolvedValue({
      id: 's2',
      schoolId: 'school-1',
      bandId: 'band-pp',
      grade: null,
      name: 'Nursery B',
    });
    render(RosterPage);
    await waitFor(() => expect(screen.getByTestId('create-section')).toBeInTheDocument());

    await user.clear(screen.getByTestId('section-name'));
    await user.type(screen.getByTestId('section-name'), 'Nursery B');
    await user.click(screen.getByTestId('create-section'));

    await waitFor(() => {
      expect(createSection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nursery B', bandId: 'band-pp' }),
      );
    });
  });

  it('creates a child in the selected section', async () => {
    const user = userEvent.setup();
    vi.mocked(createChild).mockResolvedValue({
      id: 'c2',
      sectionId: 's1',
      name: 'Priya',
      rollNumber: '13',
      dob: null,
      status: 'active',
      reportLanguageOverride: null,
      accessNote: null,
    });
    render(RosterPage);
    await waitFor(() => expect(screen.getByTestId('create-child')).toBeInTheDocument());

    await user.type(screen.getByTestId('child-name'), 'Priya');
    await user.type(screen.getByTestId('child-roll'), '13');
    await user.click(screen.getByTestId('create-child'));

    await waitFor(() => {
      expect(createChild).toHaveBeenCalledWith({
        sectionId: 's1',
        name: 'Priya',
        rollNumber: '13',
      });
    });
  });

  it('sends teacher invite', async () => {
    const user = userEvent.setup();
    vi.mocked(inviteTeacher).mockResolvedValue({
      identityId: 'new-id-12345678',
      delivery: 'email',
    });
    render(RosterPage);
    await waitFor(() => expect(screen.getByTestId('invite-submit')).toBeInTheDocument());

    await user.type(screen.getByTestId('invite-email'), 'new@schoolx.dev');
    await user.click(screen.getByTestId('invite-submit'));

    await waitFor(() => {
      expect(inviteTeacher).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@schoolx.dev',
          memberType: 'teacher',
        }),
      );
    });
    expect(screen.getByTestId('invite-ok')).toHaveTextContent(/Invite sent/);
  });
});
