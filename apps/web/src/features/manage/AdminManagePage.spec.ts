import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import AdminManagePage from './AdminManagePage.svelte';

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
  getAdminFestivalPlanner: vi.fn(),
  getAdminSettlingProgramme: vi.fn(),
  getSchoolEcaCcaBundle: vi.fn(),
  enableSchoolEcaCcaCatalogItem: vi.fn(),
  createSchoolOnlyEcaCca: vi.fn(),
  patchSchoolEcaCcaItem: vi.fn(),
  deleteSchoolEcaCcaItem: vi.fn(),
}));

import {
  getAdminFestivalPlanner,
  getAdminSettlingProgramme,
  getSchoolEcaCcaBundle,
} from './api';

describe('AdminManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSchoolEcaCcaBundle).mockResolvedValue({
      catalog: [
        {
          id: 'c1',
          name: 'Sports Day',
          kind: 'eca',
          iconKey: 'sports',
          sortOrder: 1,
          isActive: true,
        },
      ],
      schoolItems: [
        {
          id: 's1',
          schoolId: 'school-1',
          catalogId: 'c1',
          name: 'Sports Day',
          kind: 'eca',
          iconKey: 'sports',
          isActive: true,
          isSchoolOnly: false,
        },
      ],
    });
  });

  it('loads festival planner and settling without teacher context', async () => {
    vi.mocked(getAdminFestivalPlanner).mockResolvedValue({
      schoolId: 'school-1',
      sectionsBehindCount: 0,
      sectionsTotal: 2,
      festivals: [{ id: '1', name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
    });
    vi.mocked(getAdminSettlingProgramme).mockResolvedValue({
      bandId: 'band-pp',
      steps: [{ weekNumber: 1, title: 'Welcome', body: 'Routines' }],
    });

    render(AdminManagePage);

    await waitFor(() => {
      expect(screen.getByTestId('admin-festival')).toHaveTextContent(
        '1 festival(s) · 0/2 sections behind',
      );
    });
    expect(screen.getByText(/Dashain/)).toBeInTheDocument();
    expect(screen.getByTestId('admin-settling')).toHaveTextContent(
      '1 settling weeks configured',
    );
    expect(getAdminSettlingProgramme).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('school-eca-cca')).toBeInTheDocument();
      expect(getSchoolEcaCcaBundle).toHaveBeenCalled();
    });
  });
});
