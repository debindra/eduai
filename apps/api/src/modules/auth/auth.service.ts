import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { SupabaseService } from '../../database/supabase.service';
import {
  AUTH_PROVIDER_PORT,
  type AuthProviderPort,
  type AuthSession,
} from '../../shared/ports/auth-provider.port';
import {
  MESSAGING_PROVIDER_PORT,
  type MessagingProviderPort,
} from '../../shared/ports/messaging-provider.port';
import {
  OTP_FALLBACK_PORT,
  type OtpFallbackPort,
} from '../../shared/ports/otp-fallback.port';
import type { AcceptInviteDto } from './dto/accept-invite.dto';
import type { InviteDto } from './dto/invite.dto';
import type { VerifyRecoveryOtpDto } from './dto/verify-recovery-otp.dto';

const SYNTHETIC_EMAIL_DOMAIN = 'phone.eduai.internal';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RECOVERY_OTP_TTL_MS = 10 * 60 * 1000;

interface IdentityRow {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  phone: string | null;
  account_status: string;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
}

interface RecoveryOtpEntry {
  hash: string;
  expiresAt: number;
  identityId: string;
}

@Injectable()
export class AuthService {
  private readonly recoveryOtps = new Map<string, RecoveryOtpEntry>();

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(AUTH_PROVIDER_PORT) private readonly authProvider: AuthProviderPort,
    @Inject(MESSAGING_PROVIDER_PORT) private readonly messaging: MessagingProviderPort,
    @Inject(OTP_FALLBACK_PORT) private readonly otpFallback: OtpFallbackPort,
  ) {}

  resolveIdentifierToEmail(identifier: string): string {
    const trimmed = identifier.trim();
    if (this.isEmailLike(trimmed)) {
      return trimmed.toLowerCase();
    }
    const digits = this.extractDigits(trimmed);
    if (digits.length < 10) {
      throw new BadRequestException('Identifier must be a valid email or mobile number');
    }
    return `${digits}@${SYNTHETIC_EMAIL_DOMAIN}`;
  }

  async login(identifier: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    identity: {
      id: string;
      email: string | null;
      phone: string | null;
      displayName: string | null;
    };
    memberType: 'admin' | 'teacher' | 'super_admin';
    schoolId: string | null;
    memberships: Array<{ schoolId: string; memberType: 'admin' | 'teacher' }>;
  }> {
    const email = this.resolveIdentifierToEmail(identifier);
    let session: AuthSession;
    try {
      session = await this.authProvider.signInWithPassword(email, password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      throw new UnauthorizedException(message);
    }
    const client = this.requireClient();
    const { data: identity, error } = await client
      .from('identities')
      .select('id, email, phone, account_status')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    if (error || !identity) {
      throw new UnauthorizedException('Account not provisioned');
    }
    if (identity.account_status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Platform path is separate from school_memberships (school_id NOT NULL).
    const { data: platformAdmin } = await client
      .from('platform_admins')
      .select('id, display_name, status')
      .eq('identity_id', identity.id)
      .eq('status', 'active')
      .maybeSingle();
    if (platformAdmin) {
      return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
        identity: {
          id: identity.id,
          email: identity.email,
          phone: identity.phone,
          displayName: platformAdmin.display_name ?? null,
        },
        memberType: 'super_admin',
        schoolId: null,
        memberships: [],
      };
    }

    const { data: membershipRows, error: membershipError } = await client
      .from('school_memberships')
      .select('id, school_id, member_type, status')
      .eq('identity_id', identity.id)
      .eq('status', 'active')
      .in('member_type', ['admin', 'teacher'])
      .order('member_type', { ascending: true })
      .order('school_id', { ascending: true });
    if (membershipError || !membershipRows || membershipRows.length === 0) {
      throw new UnauthorizedException('No active school membership');
    }
    // Deterministic selection: admin before teacher (lexicographic), then school_id ASC.
    // Full list returned in memberships so multi-school users are not ambiguous.
    const membership = membershipRows[0]!;
    if (membership.member_type !== 'admin' && membership.member_type !== 'teacher') {
      throw new UnauthorizedException('Web login is only for admin and teacher accounts');
    }
    let displayName: string | null = null;
    if (membership.member_type === 'teacher') {
      const { data: teacher } = await client
        .from('teachers')
        .select('display_name')
        .eq('membership_id', membership.id)
        .maybeSingle();
      displayName = teacher?.display_name ?? null;
    } else {
      const { data: admin } = await client
        .from('school_admins')
        .select('display_name')
        .eq('membership_id', membership.id)
        .maybeSingle();
      displayName = admin?.display_name ?? null;
    }
    const memberships = membershipRows
      .filter(
        (row): row is typeof row & { member_type: 'admin' | 'teacher' } =>
          row.member_type === 'admin' || row.member_type === 'teacher',
      )
      .map((row) => ({
        schoolId: row.school_id as string,
        memberType: row.member_type,
      }));
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      identity: {
        id: identity.id,
        email: identity.email,
        phone: identity.phone,
        displayName,
      },
      memberType: membership.member_type,
      schoolId: membership.school_id,
      memberships,
    };
  }

  async invite(dto: InviteDto): Promise<{ identityId: string; delivery: 'email' | 'mobile' }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }
    if (dto.email && dto.phone) {
      throw new BadRequestException('Provide email or phone, not both');
    }
    const client = this.requireClient();
    const now = new Date();
    const inviteExpiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
    let inviteTokenHash: string | null = null;
    let rawToken: string | null = null;
    if (dto.phone) {
      rawToken = randomBytes(32).toString('hex');
      inviteTokenHash = this.hashToken(rawToken);
    }
    const { data: identity, error: identityError } = await client
      .from('identities')
      .insert({
        email: dto.email ?? null,
        phone: dto.phone ? this.extractDigits(dto.phone) : null,
        account_status: 'invited',
        invited_at: now.toISOString(),
        invite_token_hash: inviteTokenHash,
        invite_expires_at: dto.phone ? inviteExpiresAt : null,
      })
      .select('id')
      .single();
    if (identityError || !identity) {
      throw new BadRequestException(identityError?.message ?? 'Failed to create identity');
    }
    const { data: membership, error: membershipError } = await client
      .from('school_memberships')
      .insert({
        identity_id: identity.id,
        school_id: dto.schoolId,
        member_type: dto.memberType,
        status: 'active',
      })
      .select('id')
      .single();
    if (membershipError || !membership) {
      throw new BadRequestException(membershipError?.message ?? 'Failed to create membership');
    }
    if (dto.memberType === 'teacher') {
      const { error: teacherError } = await client.from('teachers').insert({
        membership_id: membership.id,
        display_name: dto.displayName ?? null,
      });
      if (teacherError) {
        throw new BadRequestException(teacherError.message);
      }
    } else {
      const { error: adminError } = await client.from('school_admins').insert({
        membership_id: membership.id,
        display_name: dto.displayName ?? null,
      });
      if (adminError) {
        throw new BadRequestException(adminError.message);
      }
    }
    if (dto.email) {
      await this.authProvider.inviteByEmail(dto.email);
      return { identityId: identity.id, delivery: 'email' };
    }
    if (!dto.phone || !rawToken) {
      throw new BadRequestException('Mobile invite requires a phone number');
    }
    await this.messaging.sendInviteToken(dto.phone, rawToken, 'whatsapp');
    return { identityId: identity.id, delivery: 'mobile' };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<{ message: string }> {
    const client = this.requireClient();
    const { data: identity, error } = await client
      .from('identities')
      .select('id, phone, email, auth_user_id, account_status, invite_token_hash, invite_expires_at')
      .eq('id', dto.identityId)
      .maybeSingle();
    if (error || !identity) {
      throw new NotFoundException('Invite not found');
    }
    const row = identity as IdentityRow;
    if (row.account_status !== 'invited') {
      throw new BadRequestException('Invite is no longer valid');
    }
    if (!row.phone) {
      throw new BadRequestException('Email invites are accepted via the Supabase email link');
    }
    if (!row.invite_token_hash || !row.invite_expires_at) {
      throw new BadRequestException('Invite token is missing');
    }
    if (new Date(row.invite_expires_at).getTime() < Date.now()) {
      throw new BadRequestException('Invite token has expired');
    }
    const tokenHash = this.hashToken(dto.token);
    if (tokenHash !== row.invite_token_hash) {
      throw new UnauthorizedException('Invalid invite token');
    }
    const syntheticEmail = this.resolveIdentifierToEmail(row.phone);
    const authUser = await this.authProvider.createUserWithPassword(syntheticEmail, dto.password);
    const { error: updateError } = await client
      .from('identities')
      .update({
        auth_user_id: authUser.id,
        account_status: 'active',
        invite_token_hash: null,
        invite_expires_at: null,
      })
      .eq('id', row.id);
    if (updateError) {
      throw new BadRequestException(updateError.message);
    }
    return { message: 'Invite accepted' };
  }

  async requestRecoveryOtp(identifier: string): Promise<{ message: string }> {
    const identity = await this.findIdentityByIdentifier(identifier);
    if (!identity.phone) {
      throw new BadRequestException('Recovery requires a phone number on the account');
    }
    if (identity.account_status !== 'active' || !identity.auth_user_id) {
      throw new BadRequestException('Account is not eligible for recovery');
    }
    const otp = randomInt(100000, 999999).toString();
    const entry: RecoveryOtpEntry = {
      hash: this.hashToken(otp),
      expiresAt: Date.now() + RECOVERY_OTP_TTL_MS,
      identityId: identity.id,
    };
    this.recoveryOtps.set(identity.id, entry);
    try {
      await this.messaging.sendRecoveryOtp(identity.phone, otp, 'whatsapp');
    } catch {
      await this.otpFallback.sendSmsOtp(identity.phone, otp);
    }
    return { message: 'Recovery OTP sent' };
  }

  async verifyRecoveryOtpAndSetPassword(dto: VerifyRecoveryOtpDto): Promise<{ message: string }> {
    const identity = await this.findIdentityByIdentifier(dto.identifier);
    const entry = this.recoveryOtps.get(identity.id);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new UnauthorizedException('OTP expired or not requested');
    }
    if (this.hashToken(dto.otp) !== entry.hash) {
      throw new UnauthorizedException('Invalid OTP');
    }
    if (!identity.auth_user_id) {
      throw new BadRequestException('Account has no auth user');
    }
    await this.authProvider.setPassword(identity.auth_user_id, dto.newPassword);
    this.recoveryOtps.delete(identity.id);
    return { message: 'Password updated' };
  }

  private async findIdentityByIdentifier(identifier: string): Promise<IdentityRow> {
    const client = this.requireClient();
    const trimmed = identifier.trim();
    let query = client
      .from('identities')
      .select('id, auth_user_id, email, phone, account_status, invite_token_hash, invite_expires_at');
    if (this.isEmailLike(trimmed)) {
      query = query.eq('email', trimmed.toLowerCase());
    } else {
      const digits = this.extractDigits(trimmed);
      query = query.eq('phone', digits);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Account not found');
    }
    return data as IdentityRow;
  }

  private isEmailLike(value: string): boolean {
    return value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private extractDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private requireClient() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new BadRequestException('Database is not configured');
    }
    return client;
  }
}
