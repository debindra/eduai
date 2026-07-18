import { Injectable, Logger } from '@nestjs/common';
import type { OtpFallbackPort } from '../../../shared/ports/otp-fallback.port';

@Injectable()
export class ConsoleOtpAdapter implements OtpFallbackPort {
  private readonly logger = new Logger(ConsoleOtpAdapter.name);

  async sendSmsOtp(recipient: string, otp: string): Promise<void> {
    this.logger.log(`[dev stub] SMS OTP fallback to ${recipient}: ${otp}`);
  }
}
