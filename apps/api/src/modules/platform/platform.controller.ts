import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Req,
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
import {
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
