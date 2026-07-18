import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { SectionReadGuard } from '../guards/section-read.guard';
import { SectionSubjectWriteGuard } from '../guards/section-subject-write.guard';
import { SubstituteRoleGuard } from '../guards/substitute-role.guard';

export const SECTION_SUBJECT_SCOPE_KEY = 'sectionSubjectScope';

export interface SectionSubjectScopeOptions {
  sectionIdParam?: string;
  subjectIdParam?: string;
  sectionIdBody?: string;
  subjectIdBody?: string;
}

export const SUBSTITUTE_BLOCKS_CONFIRMATION_KEY = 'substituteBlocksConfirmation';

export const RequireSectionSubjectScope = (options: SectionSubjectScopeOptions) =>
  applyDecorators(
    SetMetadata(SECTION_SUBJECT_SCOPE_KEY, options),
    UseGuards(SectionReadGuard, SectionSubjectWriteGuard),
  );

export const BlocksSubstituteConfirmation = () =>
  applyDecorators(
    SetMetadata(SUBSTITUTE_BLOCKS_CONFIRMATION_KEY, true),
    UseGuards(SubstituteRoleGuard),
  );
