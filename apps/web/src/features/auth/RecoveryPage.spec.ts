import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import RecoveryPage from './RecoveryPage.svelte';

const mockPush = vi.fn();

vi.mock('@keenmate/svelte-spa-router', () => ({
  link: () => ({ destroy: () => {} }),
  push: (...args: unknown[]) => mockPush(...args),
}));

vi.mock('./api', () => ({
  requestRecoveryOtp: vi.fn(),
  verifyRecoveryOtpAndSetPassword: vi.fn(),
}));

import { requestRecoveryOtp, verifyRecoveryOtpAndSetPassword } from './api';

const mockRequestRecoveryOtp = vi.mocked(requestRecoveryOtp);
const mockVerify = vi.mocked(verifyRecoveryOtpAndSetPassword);

describe('RecoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests an OTP then moves to the verify step', async () => {
    mockRequestRecoveryOtp.mockResolvedValue({ message: 'OTP sent over WhatsApp' });
    const user = userEvent.setup();

    render(RecoveryPage);

    await user.type(screen.getByLabelText(/mobile number/i), '9800000000');
    await user.click(screen.getByRole('button', { name: /send recovery otp/i }));

    await waitFor(() => {
      expect(mockRequestRecoveryOtp).toHaveBeenCalledWith({ identifier: '9800000000' });
    });
    await waitFor(() => {
      expect(screen.getByText('OTP sent over WhatsApp')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('OTP')).toBeInTheDocument();
  });

  it('shows an error and stays on the request step when the OTP request fails', async () => {
    mockRequestRecoveryOtp.mockRejectedValue(new Error('Account not eligible'));
    const user = userEvent.setup();

    render(RecoveryPage);

    await user.type(screen.getByLabelText(/mobile number/i), '9800000000');
    await user.click(screen.getByRole('button', { name: /send recovery otp/i }));

    await waitFor(() => {
      expect(screen.getByText('Account not eligible')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('OTP')).not.toBeInTheDocument();
  });

  it('verifies OTP, sets the new password, and redirects to login', async () => {
    mockRequestRecoveryOtp.mockResolvedValue({ message: 'OTP sent' });
    mockVerify.mockResolvedValue({ message: 'Password updated' });
    const user = userEvent.setup();

    render(RecoveryPage);

    await user.type(screen.getByLabelText(/mobile number/i), '9800000000');
    await user.click(screen.getByRole('button', { name: /send recovery otp/i }));
    await waitFor(() => expect(screen.getByLabelText('OTP')).toBeInTheDocument());

    await user.type(screen.getByLabelText('OTP'), '123456');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() => {
      expect(mockVerify).toHaveBeenCalledWith({
        identifier: '9800000000',
        otp: '123456',
        newPassword: 'NewPass123!',
      });
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
  });

  it('shows an error and does not redirect when verification fails', async () => {
    mockRequestRecoveryOtp.mockResolvedValue({ message: 'OTP sent' });
    mockVerify.mockRejectedValue(new Error('Invalid OTP'));
    const user = userEvent.setup();

    render(RecoveryPage);

    await user.type(screen.getByLabelText(/mobile number/i), '9800000000');
    await user.click(screen.getByRole('button', { name: /send recovery otp/i }));
    await waitFor(() => expect(screen.getByLabelText('OTP')).toBeInTheDocument());

    await user.type(screen.getByLabelText('OTP'), '000000');
    await user.type(screen.getByLabelText(/new password/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
