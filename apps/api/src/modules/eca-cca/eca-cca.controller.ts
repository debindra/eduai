import {
  Body,
  Controller,
  Delete,
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
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CreateSchoolOnlyItemDto,
  EnableCatalogItemDto,
  SchoolEcaCcaBundleDto,
  SchoolEcaCcaItemDto,
  UpdateSchoolOnlyItemDto,
} from './dto/eca-cca.dto';
import { EcaCcaService } from './eca-cca.service';

@ApiTags('school-eca-cca')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequireRoleGuard, RequireSchoolAdminGuard)
@RequireRole('admin')
@RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
@Controller('schools/:schoolId/eca-cca')
export class EcaCcaController {
  constructor(private readonly service: EcaCcaService) {}

  @Get()
  @ApiOperation({
    summary: 'List active catalog + this school’s enabled / school-only items',
  })
  @ApiResponse({ status: 200, type: SchoolEcaCcaBundleDto })
  getBundle(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
  ): Promise<SchoolEcaCcaBundleDto> {
    return this.service.getSchoolBundle(schoolId);
  }

  @Post('enable')
  @ApiOperation({ summary: 'Enable a global catalog item for this school' })
  @ApiResponse({ status: 201, type: SchoolEcaCcaItemDto })
  enable(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: EnableCatalogItemDto,
  ): Promise<SchoolEcaCcaItemDto> {
    return this.service.enableCatalogItem(schoolId, dto.catalogId);
  }

  @Post('school-only')
  @ApiOperation({ summary: 'Create a school-only ECA/CCA item' })
  @ApiResponse({ status: 201, type: SchoolEcaCcaItemDto })
  createSchoolOnly(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: CreateSchoolOnlyItemDto,
  ): Promise<SchoolEcaCcaItemDto> {
    return this.service.createSchoolOnlyItem(schoolId, dto);
  }

  @Patch(':itemId')
  @ApiOperation({
    summary:
      'Update school-only fields, or toggle isActive alone for catalog-backed or school-only items',
  })
  @ApiResponse({ status: 200, type: SchoolEcaCcaItemDto })
  update(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateSchoolOnlyItemDto,
  ): Promise<SchoolEcaCcaItemDto> {
    const onlyActiveToggle =
      dto.isActive !== undefined &&
      dto.name === undefined &&
      dto.kind === undefined &&
      dto.iconKey === undefined;
    if (onlyActiveToggle) {
      return this.service.setSchoolItemActive(schoolId, itemId, dto.isActive!);
    }
    return this.service.updateSchoolOnlyItem(schoolId, itemId, dto);
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Soft-delete a school ECA/CCA item' })
  @ApiResponse({ status: 200 })
  remove(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.softDeleteSchoolItem(schoolId, itemId);
  }
}
