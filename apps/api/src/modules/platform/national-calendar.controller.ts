import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePlatformAdmin } from '../auth/decorators/require-platform-admin.decorator';
import { RequirePlatformAdminGuard } from '../auth/guards/require-platform-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreateNationalCalendarDto,
  NationalCalendarDto,
  NationalCalendarsResponseDto,
  PatchNationalClosuresDto,
  PatchNationalWeeklyOffsDto,
} from './dto/national-calendar.dto';
import { NationalCalendarService } from './national-calendar.service';

@ApiTags('platform-national-calendar')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequirePlatformAdminGuard)
@RequirePlatformAdmin()
@Controller('platform/national-calendars')
export class NationalCalendarController {
  constructor(private readonly service: NationalCalendarService) {}

  @Get()
  @ApiOperation({ summary: 'List national calendars (all statuses)' })
  @ApiResponse({ status: 200, type: NationalCalendarsResponseDto })
  list(): Promise<NationalCalendarsResponseDto> {
    return this.service.listCalendars();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one national calendar with closures' })
  @ApiResponse({ status: 200, type: NationalCalendarDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<NationalCalendarDto> {
    return this.service.getCalendar(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft national calendar for a BS year' })
  @ApiResponse({ status: 201, type: NationalCalendarDto })
  create(@Body() dto: CreateNationalCalendarDto): Promise<NationalCalendarDto> {
    return this.service.createDraft(dto);
  }

  @Patch(':id/closures')
  @ApiOperation({ summary: 'Upsert closures on a national calendar' })
  @ApiResponse({ status: 200, type: NationalCalendarDto })
  patchClosures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchNationalClosuresDto,
  ): Promise<NationalCalendarDto> {
    return this.service.upsertClosures(id, dto.closures);
  }

  @Patch(':id/weekly-offs')
  @ApiOperation({
    summary: 'Set national weekly day-off preset (ISO weekdays)',
    description:
      'Schools inherit these at calendar setup; school admins may override later on school_calendars.weekly_offs.',
  })
  @ApiResponse({ status: 200, type: NationalCalendarDto })
  patchWeeklyOffs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchNationalWeeklyOffsDto,
  ): Promise<NationalCalendarDto> {
    return this.service.patchWeeklyOffs(id, dto.weeklyOffs);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish a national calendar (makes closures visible to teaching_days)',
  })
  @ApiResponse({ status: 200, type: NationalCalendarDto })
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<NationalCalendarDto> {
    return this.service.publish(id);
  }
}
