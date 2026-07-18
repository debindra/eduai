import { appendFileSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import type {
  MessagingChannel,
  MessagingProviderPort,
} from '../../../shared/ports/messaging-provider.port';

/** When API_LOG_FILE is set (e2e), tee stub messages so tests can read OTPs. */
function teeDevStub(message: string): void {
  const logFile = process.env.API_LOG_FILE;
  if (!logFile) return;
  try {
    appendFileSync(logFile, `${message}\n`);
  } catch {
    // Never fail messaging because of e2e log tee
  }
}

@Injectable()
export class ConsoleMessagingAdapter implements MessagingProviderPort {
  private readonly logger = new Logger(ConsoleMessagingAdapter.name);

  async sendInviteToken(
    recipient: string,
    token: string,
    channel: MessagingChannel,
  ): Promise<void> {
    const message = `[dev stub] ${channel} invite to ${recipient} — raw token (dev only): ${token}`;
    this.logger.log(message);
    teeDevStub(message);
  }

  async sendRecoveryOtp(
    recipient: string,
    otp: string,
    channel: MessagingChannel,
  ): Promise<void> {
    const message = `[dev stub] ${channel} recovery OTP to ${recipient}: ${otp}`;
    this.logger.log(message);
    teeDevStub(message);
  }

  async sendAttendanceConfirmation(
    recipient: string,
    childName: string,
    status: string,
    day: string,
    channel: MessagingChannel,
  ): Promise<void> {
    const message = `[dev stub] ${channel} attendance to ${recipient}: ${childName} marked ${status} on ${day}`;
    this.logger.log(message);
    teeDevStub(message);
  }
}
