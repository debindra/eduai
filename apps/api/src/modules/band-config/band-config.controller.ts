import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BandConfigService } from './band-config.service';
import { BandsListResponseDto } from './dto/band-response.dto';

@ApiTags('band-config')
@Controller('bands')
export class BandConfigController {
  constructor(private readonly bandConfigService: BandConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'List band configuration',
    description: `Returns all bands with grade_scales and subjects.\n\nInvariant #4: Band-as-data — no grade-number branching in code. Read assessment_mode / aggregation_rule off each band row.\n\nPublic endpoint — used for band selection during school setup and feature discovery.`,
  })
  @ApiOkResponse({ type: BandsListResponseDto })
  async listBands(): Promise<BandsListResponseDto> {
    const bands = await this.bandConfigService.listBands();
    return { bands };
  }
}
