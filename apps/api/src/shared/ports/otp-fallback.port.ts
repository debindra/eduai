export interface OtpFallbackPort {
  sendSmsOtp(recipient: string, otp: string): Promise<void>;
}

export const OTP_FALLBACK_PORT = Symbol('OTP_FALLBACK_PORT');
