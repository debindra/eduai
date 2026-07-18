import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutOfSegmentRepository, OutOfSegmentService } from './out-of-segment.service';

describe('OutOfSegmentService', () => {
  let service: OutOfSegmentService;
  let repository: {
    findSchoolLicence: ReturnType<typeof vi.fn>;
    findBandCode: ReturnType<typeof vi.fn>;
    insertLog: ReturnType<typeof vi.fn>;
    listBySchool: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findSchoolLicence: vi.fn(),
      findBandCode: vi.fn(),
      insertLog: vi.fn().mockResolvedValue(undefined),
      listBySchool: vi.fn(),
    };
    service = new OutOfSegmentService(repository as unknown as OutOfSegmentRepository);
  });

  it('logs when the requested band is outside the licence', async () => {
    repository.findSchoolLicence.mockResolvedValue('pre_primary');
    repository.findBandCode.mockResolvedValue('basic_upper');

    const logged = await service.logIfOutOfSegment('school-1', 'methods_toolkit', 'band-bu');

    expect(logged).toBe(true);
    expect(repository.insertLog).toHaveBeenCalledWith({
      school_id: 'school-1',
      requested_feature: 'methods_toolkit',
      requested_band: 'basic_upper',
    });
  });

  it('does not log when the band is within the licence', async () => {
    repository.findSchoolLicence.mockResolvedValue('pre_primary');
    repository.findBandCode.mockResolvedValue('pre_primary');

    const logged = await service.logIfOutOfSegment('school-1', 'methods_toolkit', 'band-pp');

    expect(logged).toBe(false);
    expect(repository.insertLog).not.toHaveBeenCalled();
  });

  it('does not log when the band cannot be resolved', async () => {
    repository.findSchoolLicence.mockResolvedValue('pre_primary');
    repository.findBandCode.mockResolvedValue(null);

    const logged = await service.logIfOutOfSegment('school-1', 'methods_toolkit', 'missing');

    expect(logged).toBe(false);
    expect(repository.insertLog).not.toHaveBeenCalled();
  });

  it('returns counts/shapes only for the admin surface', async () => {
    repository.listBySchool.mockResolvedValue([
      { requested_feature: 'methods_toolkit', requested_band: 'basic_upper' },
      { requested_feature: 'methods_toolkit', requested_band: 'basic_upper' },
      { requested_feature: 'lesson_generator', requested_band: 'basic_early' },
    ]);

    const result = await service.adminCounts('school-1');

    expect(result.total).toBe(3);
    expect(result.byBand).toEqual({ basic_upper: 2, basic_early: 1 });
    expect(result.byFeature).toEqual({ methods_toolkit: 2, lesson_generator: 1 });
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/childName|rating|teacherId/i);
  });
});
