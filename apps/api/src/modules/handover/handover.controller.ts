import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionReadScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { HandoverService } from './handover.service';

class AssembleDto {
  @ApiProperty()
  @IsString()
  departingTeacherId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incomingTeacherId?: string;
}

@ApiTags('handover')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('handover')
export class HandoverController {
  constructor(private readonly service: HandoverService) {}

  @Post(':sectionId/assemble')
  @UseGuards(RequireRoleGuard)
  @RequireRole('admin')
  @ApiOperation({
    summary: 'Materialize handover_pack snapshot',
    description: `Creates a snapshot of section data for teacher handover (year-end or mid-year transition).\n\nInvariant #10: Coach chat content is structurally excluded from handover packs — never joined to child records.\n\nSnapshot includes:\n- Current outcomes/milestones\n- Attendance summary\n- Portfolio photos (if consent)\n- Annex 3 document\n\nRequires: RequireRoleGuard (role='admin'). Snapshot is queried by incoming teacher — not a live join.`,
  })
  @ApiOkResponse({ description: 'Handover pack assembled successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not an admin' })
  assemble(@Param('sectionId') sectionId: string, @Body() dto: AssembleDto) {
    return this.service.assemble(sectionId, dto.departingTeacherId, dto.incomingTeacherId);
  }

  @Get(':sectionId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Read latest materialized handover pack',
    description: `Returns the most recent handover pack snapshot for a section.\n\nRequires: RequireSectionReadScope (teacher has access to this section). Incoming teacher uses this to review departing teacher's records.`,
  })
  @ApiOkResponse({ description: 'Handover pack retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'No handover pack found for this section' })
  get(@Param('sectionId') sectionId: string, @Req() _req: Request) {
    return this.service.getLatest(sectionId);
  }
}
