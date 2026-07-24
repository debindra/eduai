import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import { YearlyMapService } from './yearly-map.service';

@ApiTags('yearly-map')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('yearly-map')
export class YearlyMapController {
  constructor(private readonly service: YearlyMapService) {}

  @Get(':sectionId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Get yearly map and slices for a section',
    description: `Returns yearly map with curriculum slices distributed across terminals.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Yearly map retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'Section or yearly map not found' })
  getMap(@Param('sectionId') sectionId: string) {
    return this.service.getMap(sectionId);
  }

  @Post(':sectionId/regenerate')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Deterministically regenerate map slices from teaching_days (no AI)',
    description: `Recalculates curriculum distribution across terminals when calendar changes.\n\nInvariant #13: Deterministic stays deterministic — pure placement algorithm, zero AI calls.\n\nInvariant #6: Teaching days are always derived — this reflows when calendar edits change the denominator.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Yearly map regenerated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid section state or missing calendar data' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  regenerate(@Param('sectionId') sectionId: string) {
    return this.service.regenerate(sectionId);
  }

  @Post(':sectionId/approve')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Approve draft yearly map',
    description: `Confirms generated yearly map for use in lesson planning and pacing.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Yearly map approved successfully' })
  @ApiBadRequestResponse({ description: 'No draft map to approve or already approved' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  approve(@Param('sectionId') sectionId: string) {
    return this.service.approve(sectionId);
  }
}
