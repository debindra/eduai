import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import SubjectPage from './SubjectPage.svelte';
import { seedTeacherContext } from '../../lib/shared/stores/teacher-context.test-helpers';

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
  getSubjectView: vi.fn(),
}));

import { getSubjectView } from './api';

describe('SubjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedTeacherContext({
      sectionId: 's1',
      subjectId: 'math',
      subjectName: 'Mathematics',
      isClassTeacher: false,
      grade: 'Grade 1',
      bandId: 'band-early',
      assessmentMode: 'four_point_scale',
    });
  });

  it('shows subject outcomes and section roster', async () => {
    vi.mocked(getSubjectView).mockResolvedValue({
      sectionId: 's1',
      subjectId: 'math',
      subjectName: 'Mathematics',
      writeScope: 'subject',
      hasWriteGrain: true,
      outcomes: [{ id: 'o1', code: 'G1-MATH-001', statement: 'Counts to 20' }],
      children: [{ id: 'c1', name: 'Nisha Rai', rollNumber: '1' }],
      confirmedCount: 0,
      confirmed: [],
    });
    render(SubjectPage);
    await waitFor(() => {
      expect(screen.getByTestId('subject-view')).toHaveTextContent('Mathematics');
    });
    expect(screen.getByTestId('subject-view')).toHaveTextContent('Counts to 20');
    expect(screen.getByTestId('subject-view')).toHaveTextContent('Nisha Rai');
  });
});
