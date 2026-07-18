export type MessagingChannel = 'whatsapp' | 'sms';

export interface MessagingProviderPort {
  sendInviteToken(recipient: string, token: string, channel: MessagingChannel): Promise<void>;
  sendRecoveryOtp(recipient: string, otp: string, channel: MessagingChannel): Promise<void>;
  sendAttendanceConfirmation(
    recipient: string,
    childName: string,
    status: string,
    day: string,
    channel: MessagingChannel,
  ): Promise<void>;
}

export const MESSAGING_PROVIDER_PORT = Symbol('MESSAGING_PROVIDER_PORT');
