import { Controller, Get } from '@nestjs/common';
import { DB_PACKAGE_VERSION } from '@eduai/db';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): { status: string; dbPackage: string } {
    return { status: 'ok', dbPackage: DB_PACKAGE_VERSION };
  }
}
