import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEACHER_PHONE } from './auth';

const DEFAULT_LOG = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.api-e2e.log',
);

function getLogPath(): string {
  return process.env.API_LOG_FILE ?? DEFAULT_LOG;
}

/**
 * Poll API_LOG_FILE for the ConsoleMessagingAdapter recovery OTP line.
 * Pattern: `[dev stub] whatsapp recovery OTP to 9811111111: 123456`
 */
export async function waitForRecoveryOtp(
  phone: string = TEACHER_PHONE,
  timeoutMs = 20_000,
): Promise<string> {
  const logPath = getLogPath();
  const pattern = new RegExp(
    `\\[dev stub\\] (?:whatsapp|sms) recovery OTP to ${phone}: (\\d{6})`,
  );
  const deadline = Date.now() + timeoutMs;
  let lastContent = '';

  while (Date.now() < deadline) {
    if (existsSync(logPath)) {
      lastContent = readFileSync(logPath, 'utf8');
      const match = lastContent.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `Timed out waiting for recovery OTP for ${phone} in ${logPath}. ` +
      `Log tail:\n${lastContent.slice(-800)}`,
  );
}
