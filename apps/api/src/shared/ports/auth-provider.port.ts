export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthProviderPort {
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  inviteByEmail(email: string): Promise<void>;
  createUserWithPassword(email: string, password: string): Promise<AuthUser>;
  setPassword(authUserId: string, newPassword: string): Promise<void>;
  getUserFromToken(accessToken: string): Promise<AuthUser | null>;
}

export const AUTH_PROVIDER_PORT = Symbol('AUTH_PROVIDER_PORT');
