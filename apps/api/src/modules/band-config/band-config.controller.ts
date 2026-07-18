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
    summary: 'List pre-primary band configuration',
    description:
      'Returns bands, grade_scales, and subjects for the pre_primary band only. Band-as-data — no grade-number branching.',
  })
  @ApiOkResponse({ type: BandsListResponseDto })
  async listBands(): Promise<BandsListResponseDto> {
    const bands = await this.bandConfigService.listPrePrimaryBands();
    return { bands };
  }
}
