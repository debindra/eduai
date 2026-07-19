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
    description:
      'Returns all bands with grade_scales and subjects. Band-as-data — no grade-number branching; read assessment_mode / aggregation_rule off each band row.',
  })
  @ApiOkResponse({ type: BandsListResponseDto })
  async listBands(): Promise<BandsListResponseDto> {
    const bands = await this.bandConfigService.listBands();
    return { bands };
  }
}
