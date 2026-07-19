import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ECA_CCA_ICON_KEYS, ECA_CCA_KINDS } from '../eca-cca-icons';

export class CreateCatalogItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ECA_CCA_KINDS })
  @IsEnum(ECA_CCA_KINDS)
  kind!: 'eca' | 'cca';

  @ApiProperty({ enum: ECA_CCA_ICON_KEYS })
  @IsEnum(ECA_CCA_ICON_KEYS)
  iconKey!: (typeof ECA_CCA_ICON_KEYS)[number];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCatalogItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: ECA_CCA_KINDS })
  @IsOptional()
  @IsEnum(ECA_CCA_KINDS)
  kind?: 'eca' | 'cca';

  @ApiPropertyOptional({ enum: ECA_CCA_ICON_KEYS })
  @IsOptional()
  @IsEnum(ECA_CCA_ICON_KEYS)
  iconKey?: (typeof ECA_CCA_ICON_KEYS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CatalogItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ECA_CCA_KINDS })
  kind!: 'eca' | 'cca';

  @ApiProperty({ enum: ECA_CCA_ICON_KEYS })
  iconKey!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class CatalogListResponseDto {
  @ApiProperty({ type: [CatalogItemDto] })
  items!: CatalogItemDto[];
}

export class EnableCatalogItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  catalogId!: string;
}

export class CreateSchoolOnlyItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ECA_CCA_KINDS })
  @IsEnum(ECA_CCA_KINDS)
  kind!: 'eca' | 'cca';

  @ApiProperty({ enum: ECA_CCA_ICON_KEYS })
  @IsEnum(ECA_CCA_ICON_KEYS)
  iconKey!: (typeof ECA_CCA_ICON_KEYS)[number];
}

export class UpdateSchoolOnlyItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: ECA_CCA_KINDS })
  @IsOptional()
  @IsEnum(ECA_CCA_KINDS)
  kind?: 'eca' | 'cca';

  @ApiPropertyOptional({ enum: ECA_CCA_ICON_KEYS })
  @IsOptional()
  @IsEnum(ECA_CCA_ICON_KEYS)
  iconKey?: (typeof ECA_CCA_ICON_KEYS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SchoolEcaCcaItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  catalogId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ECA_CCA_KINDS })
  kind!: 'eca' | 'cca';

  @ApiProperty({ enum: ECA_CCA_ICON_KEYS })
  iconKey!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ description: 'true when catalog_id is null' })
  isSchoolOnly!: boolean;
}

export class SchoolEcaCcaBundleDto {
  @ApiProperty({ type: [CatalogItemDto], description: 'Active global catalog' })
  catalog!: CatalogItemDto[];

  @ApiProperty({ type: [SchoolEcaCcaItemDto] })
  schoolItems!: SchoolEcaCcaItemDto[];
}
