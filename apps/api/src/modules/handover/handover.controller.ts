import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
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
    description: 'Coach chat structurally excluded. Snapshot is queried by incoming teacher — not a live join.',
  })
  assemble(@Param('sectionId') sectionId: string, @Body() dto: AssembleDto) {
    return this.service.assemble(sectionId, dto.departingTeacherId, dto.incomingTeacherId);
  }

  @Get(':sectionId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Read latest materialized handover pack' })
  get(@Param('sectionId') sectionId: string, @Req() _req: Request) {
    return this.service.getLatest(sectionId);
  }
}
