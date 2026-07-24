import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePlatformAdmin } from '../auth/decorators/require-platform-admin.decorator';
import { RequirePlatformAdminGuard } from '../auth/guards/require-platform-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  CatalogItemDto,
  CatalogListResponseDto,
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
} from './dto/eca-cca.dto';
import { EcaCcaService } from './eca-cca.service';

@ApiTags('platform-eca-cca-catalog')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequirePlatformAdminGuard)
@RequirePlatformAdmin()
@Controller('platform/eca-cca-catalog')
export class EcaCcaCatalogController {
  constructor(private readonly service: EcaCcaService) {}

  @Get()
  @ApiOperation({ summary: 'List global ECA/CCA catalog (platform)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: CatalogListResponseDto })
  list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<CatalogListResponseDto> {
    return this.service.listCatalog({
      includeInactive: includeInactive === 'true' || includeInactive === '1',
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a global catalog item' })
  @ApiResponse({ status: 201, type: CatalogItemDto })
  create(@Body() dto: CreateCatalogItemDto): Promise<CatalogItemDto> {
    return this.service.createCatalogItem(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a global catalog item' })
  @ApiResponse({ status: 200, type: CatalogItemDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<CatalogItemDto> {
    return this.service.updateCatalogItem(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a global catalog item' })
  @ApiResponse({ status: 200 })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDeleteCatalogItem(id);
  }
}
