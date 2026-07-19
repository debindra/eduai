import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePlatformAdmin } from '../auth/decorators/require-platform-admin.decorator';
import { RequirePlatformAdminGuard } from '../auth/guards/require-platform-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/types/request-user.types';
import { AdminGravityRuleInterceptor } from '../rbac/interceptors/admin-gravity-rule.interceptor';
import { CalendarSetupDto } from '../calendar/dto/calendar-setup.dto';
import {
  ApproveCalendarResponseDto,
  CalendarSetupResponseDto,
  FestivalTemplateResponseDto,
  PatchFestivalTemplateDto,
} from '../calendar/dto/calendar-response.dto';
import {
  CreatePlatformSchoolDto,
  CreatePlatformSchoolResponseDto,
  CreateSupportSessionDto,
  PlatformSchoolsResponseDto,
  SupportSessionDto,
  SupportSessionsResponseDto,
} from './dto/platform.dto';
import { PlatformService } from './platform.service';

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequirePlatformAdminGuard)
@RequirePlatformAdmin()
@Controller('platform')
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  @Get('schools')
  @UseInterceptors(AdminGravityRuleInterceptor)
  @ApiOperation({
    summary: 'List all tenants (gravity-safe aggregates)',
    description:
      'Per-school counts/shapes only. No child names, band/rating distributions, or rank-order.',
  })
  @ApiResponse({ status: 200, type: PlatformSchoolsResponseDto })
  listSchools(): Promise<PlatformSchoolsResponseDto> {
    return this.service.listSchools();
  }

  @Post('schools')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AdminGravityRuleInterceptor)
  @ApiOperation({
    summary: 'Create a tenant and invite the first school admin',
    description:
      'Platform-only provisioning. Inserts the school row then invites the first admin (email or mobile).',
  })
  @ApiResponse({ status: 201, type: CreatePlatformSchoolResponseDto })
  createSchool(
    @Body() dto: CreatePlatformSchoolDto,
    @Req() req: Request,
  ): Promise<CreatePlatformSchoolResponseDto> {
    const user = req.user as RequestUser;
    return this.service.createSchool(user.identityId, dto);
  }

  @Post('schools/:schoolId/calendar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a draft school calendar during tenant provisioning',
    description:
      'Platform-only. Session, terminals, weekly offs — then use closures endpoints for holidays and ECA (Extra Curricular)/CCA (Co-Curricular).',
  })
  @ApiResponse({ status: 201, type: CalendarSetupResponseDto })
  setupSchoolCalendar(
    @Param('schoolId') schoolId: string,
    @Body() dto: CalendarSetupDto,
    @Req() req: Request,
  ): Promise<CalendarSetupResponseDto> {
    const user = req.user as RequestUser;
    return this.service.setupSchoolCalendar(user.identityId, schoolId, dto);
  }

  @Post('schools/:schoolId/calendar/ensure-draft')
  @ApiOperation({
    summary: 'Ensure editable draft (clone from approved if needed)',
    description:
      'Returns existing draft or clones the live approved calendar. Teachers keep the approved copy until re-approve.',
  })
  @ApiResponse({ status: 200, type: CalendarSetupResponseDto })
  ensureSchoolCalendarDraft(
    @Param('schoolId') schoolId: string,
    @Req() req: Request,
  ): Promise<CalendarSetupResponseDto> {
    const user = req.user as RequestUser;
    return this.service.ensureSchoolCalendarDraft(user.identityId, schoolId);
  }

  @Patch('schools/:schoolId/calendar/setup')
  @ApiOperation({
    summary: 'Update draft calendar session / terminals',
  })
  @ApiResponse({ status: 200, type: CalendarSetupResponseDto })
  updateSchoolCalendarSetup(
    @Param('schoolId') schoolId: string,
    @Body() dto: CalendarSetupDto,
    @Req() req: Request,
  ): Promise<CalendarSetupResponseDto> {
    const user = req.user as RequestUser;
    return this.service.updateSchoolCalendarSetup(user.identityId, schoolId, dto);
  }

  @Get('schools/:schoolId/calendar/closures')
  @ApiOperation({
    summary:
      'Load draft calendar closures (national + local holidays and ECA (Extra Curricular)/CCA (Co-Curricular))',
  })
  @ApiResponse({ status: 200, type: FestivalTemplateResponseDto })
  getSchoolCalendarClosures(
    @Param('schoolId') schoolId: string,
  ): Promise<FestivalTemplateResponseDto> {
    return this.service.getSchoolCalendarClosures(schoolId);
  }

  @Patch('schools/:schoolId/calendar/closures')
  @ApiOperation({
    summary:
      'Save local school closures (holidays and ECA (Extra Curricular)/CCA (Co-Curricular))',
  })
  @ApiResponse({ status: 200, type: FestivalTemplateResponseDto })
  patchSchoolCalendarClosures(
    @Param('schoolId') schoolId: string,
    @Body() dto: PatchFestivalTemplateDto,
    @Req() req: Request,
  ): Promise<FestivalTemplateResponseDto> {
    const user = req.user as RequestUser;
    return this.service.patchSchoolCalendarClosures(user.identityId, schoolId, dto);
  }

  @Post('schools/:schoolId/calendar/approve')
  @ApiOperation({
    summary: 'Approve the draft school calendar after closures are configured',
    description:
      'Promotes draft to approved and supersedes any previous approved calendar for the same year.',
  })
  @ApiResponse({ status: 200, type: ApproveCalendarResponseDto })
  approveSchoolCalendar(
    @Param('schoolId') schoolId: string,
    @Req() req: Request,
  ): Promise<ApproveCalendarResponseDto> {
    const user = req.user as RequestUser;
    return this.service.approveSchoolCalendar(user.identityId, schoolId);
  }

  @Post('support-sessions')
  @ApiOperation({ summary: 'Open a time-boxed support session for one school' })
  @ApiResponse({ status: 201, type: SupportSessionDto })
  createSupportSession(
    @Body() dto: CreateSupportSessionDto,
    @Req() req: Request,
  ): Promise<SupportSessionDto> {
    const user = req.user as RequestUser;
    return this.service.createSupportSession(user.platformAdmin!.id, dto);
  }

  @Get('support-sessions')
  @ApiOperation({ summary: 'List support sessions for the current platform admin' })
  @ApiResponse({ status: 200, type: SupportSessionsResponseDto })
  listSupportSessions(@Req() req: Request): Promise<SupportSessionsResponseDto> {
    const user = req.user as RequestUser;
    return this.service.listSupportSessions(user.platformAdmin!.id);
  }

  @Delete('support-sessions/:id')
  @ApiOperation({ summary: 'Revoke an active support session' })
  @ApiResponse({ status: 200, type: SupportSessionDto })
  revokeSupportSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<SupportSessionDto> {
    const user = req.user as RequestUser;
    return this.service.revokeSupportSession(user.platformAdmin!.id, id);
  }
}
