import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnonClient, createServiceClient } from '@eduai/db';
import type {
  AuthProviderPort,
  AuthSession,
  AuthUser,
} from '../../../shared/ports/auth-provider.port';

@Injectable()
export class SupabaseAuthAdapter implements AuthProviderPort {
  constructor(private readonly config: ConfigService) {}

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const client = this.createAnonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      throw new Error(error?.message ?? 'Sign-in failed');
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in ?? 3600,
      user: { id: data.user.id, email: data.user.email ?? undefined },
    };
  }

  async inviteByEmail(email: string): Promise<void> {
    const client = this.createServiceClient();
    const { error } = await client.auth.admin.inviteUserByEmail(email);
    if (error) {
      throw new Error(error.message);
    }
  }

  async createUserWithPassword(email: string, password: string): Promise<AuthUser> {
    const client = this.createServiceClient();
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Failed to create auth user');
    }
    return { id: data.user.id, email: data.user.email ?? undefined };
  }

  async setPassword(authUserId: string, newPassword: string): Promise<void> {
    const client = this.createServiceClient();
    const { error } = await client.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getUserFromToken(accessToken: string): Promise<AuthUser | null> {
    const client = this.createAnonClient();
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    return { id: data.user.id, email: data.user.email ?? undefined };
  }

  private createAnonClient() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    return createAnonClient({ url, anonKey });
  }

  private createServiceClient() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    return createServiceClient({ url, anonKey: '', serviceRoleKey });
  }
}
