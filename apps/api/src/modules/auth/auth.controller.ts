import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequireRole } from './decorators/require-role.decorator';
import { RequireSchoolAdmin } from './decorators/require-school-admin.decorator';
import { RequireRoleGuard } from './guards/require-role.guard';
import { RequireSchoolAdminGuard } from './guards/require-school-admin.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import {
  AuthSessionResponseDto,
  InviteResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { InviteDto } from './dto/invite.dto';
import { LoginDto } from './dto/login.dto';
import { RequestRecoveryOtpDto } from './dto/request-recovery-otp.dto';
import { VerifyRecoveryOtpDto } from './dto/verify-recovery-otp.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login with username and password',
    description:
      'Username may be a real email or mobile number. Mobile-only accounts use an internal synthetic email mapping — never stored in identities.email.',
  })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive account' })
  async login(@Body() dto: LoginDto): Promise<AuthSessionResponseDto> {
    return this.authService.login(dto.identifier, dto.password);
  }

  @Post('invite')
  @UseGuards(SupabaseAuthGuard, RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdBody: 'schoolId' })
  @ApiOperation({
    summary: 'Provision an invited Admin or Teacher identity',
    description:
      'No self-registration. Email path uses Supabase inviteUserByEmail; mobile path stores a hashed invite token and sends the raw token via WhatsApp/SMS stub.',
  })
  @ApiOkResponse({ type: InviteResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid invite payload' })
  async invite(@Body() dto: InviteDto): Promise<InviteResponseDto> {
    return this.authService.invite(dto);
  }

  @Post('accept-invite')
  @ApiOperation({
    summary: 'Accept a mobile-only invite',
    description:
      'Sets password via Supabase Admin API using the synthetic email mapping. Email invites use the Supabase email link instead.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  async acceptInvite(@Body() dto: AcceptInviteDto): Promise<MessageResponseDto> {
    return this.authService.acceptInvite(dto);
  }

  @Post('request-recovery-otp')
  @ApiOperation({
    summary: 'Request account recovery OTP',
    description:
      'Phone/WhatsApp OTP for recovery only — never a login mechanism. WhatsApp primary, SMS fallback.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  async requestRecoveryOtp(@Body() dto: RequestRecoveryOtpDto): Promise<MessageResponseDto> {
    return this.authService.requestRecoveryOtp(dto.identifier);
  }

  @Post('verify-recovery-otp-and-set-password')
  @ApiOperation({
    summary: 'Verify recovery OTP and set a new password',
    description:
      'On success calls Supabase Admin API updateUserById — bypasses Supabase email reset flow.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  async verifyRecoveryOtpAndSetPassword(
    @Body() dto: VerifyRecoveryOtpDto,
  ): Promise<MessageResponseDto> {
    return this.authService.verifyRecoveryOtpAndSetPassword(dto);
  }
}
