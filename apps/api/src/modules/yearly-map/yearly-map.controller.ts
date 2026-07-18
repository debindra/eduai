import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { YearlyMapService } from './yearly-map.service';

@ApiTags('yearly-map')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('yearly-map')
export class YearlyMapController {
  constructor(private readonly service: YearlyMapService) {}

  @Get(':sectionId')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Get yearly map and slices for a section' })
  getMap(@Param('sectionId') sectionId: string) {
    return this.service.getMap(sectionId);
  }

  @Post(':sectionId/regenerate')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Deterministically regenerate map slices from teaching_days (no AI)',
  })
  regenerate(@Param('sectionId') sectionId: string) {
    return this.service.regenerate(sectionId);
  }

  @Post(':sectionId/approve')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Approve draft yearly map' })
  approve(@Param('sectionId') sectionId: string) {
    return this.service.approve(sectionId);
  }
}
