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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
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
    summary: 'List active catalog + this school's enabled / school-only items',
    description: `Returns merged bundle: global catalog items (active) + this school's enabled catalog items + this school's custom items.

Requires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiResponse({ status: 200, type: SchoolEcaCcaBundleDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  getBundle(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
  ): Promise<SchoolEcaCcaBundleDto> {
    return this.service.getSchoolBundle(schoolId);
  }

  @Post('enable')
  @ApiOperation({
    summary: 'Enable a global catalog item for this school',
    description: `Creates a school_eca_cca_items row linking to a catalog item, making it available for this school.

Requires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiResponse({ status: 201, type: SchoolEcaCcaItemDto })
  @ApiBadRequestResponse({ description: 'Invalid catalog ID or item already enabled' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  @ApiNotFoundResponse({ description: 'Catalog item not found' })
  enable(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Body() dto: EnableCatalogItemDto,
  ): Promise<SchoolEcaCcaItemDto> {
    return this.service.enableCatalogItem(schoolId, dto.catalogId);
  }

  @Post('school-only')
  @ApiOperation({
    summary: 'Create a school-only ECA/CCA item',
    description: `Creates a custom ECA/CCA item specific to this school (not from global catalog).

Requires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiResponse({ status: 201, type: SchoolEcaCcaItemDto })
  @ApiBadRequestResponse({ description: 'Validation failed (name, kind, iconKey required)' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
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
    description: `Two modes:
1. Active toggle only (isActive provided alone) — works for catalog-backed AND school-only items
2. Full update (name, kind, iconKey) — only allowed for school-only items (catalog_id IS NULL)

Requires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiResponse({ status: 200, type: SchoolEcaCcaItemDto })
  @ApiBadRequestResponse({ description: 'Validation failed or attempt to edit catalog-backed item fields' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  @ApiNotFoundResponse({ description: 'Item not found for this school' })
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
  @ApiOperation({
    summary: 'Soft-delete a school ECA/CCA item',
    description: `Marks item as deleted (sets deleted_at timestamp). Works for both catalog-backed and school-only items.

Requires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiResponse({ status: 200, description: 'Item soft-deleted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid item ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  @ApiNotFoundResponse({ description: 'Item not found for this school' })
  remove(
    @Param('schoolId', ParseUUIDPipe) schoolId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.softDeleteSchoolItem(schoolId, itemId);
  }
}
