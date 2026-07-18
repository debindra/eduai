import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from '../stores/session';
import { ApiError, apiFetch, getApiBaseUrl } from './client';

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearSession();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('getApiBaseUrl falls back to localhost', () => {
    expect(getApiBaseUrl()).toMatch(/localhost|127\.0\.0\.1|http/);
  });

  it('sends JSON body and Authorization when session has a token', async () => {
    setSession({
      accessToken: 'token-1',
      identity: {
        id: 'identity-1',
        email: 't@school.dev',
        phone: null,
        displayName: null,
      },
      memberType: 'teacher',
      schoolId: 'school-1',
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });

    const actual = await apiFetch<{ ok: boolean }>('/calendar/setup', {
      method: 'POST',
      body: { academicYearLabel: '2082' },
    });

    expect(actual).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/calendar/setup');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ academicYearLabel: '2082' }));
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('omits Authorization when auth is false', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ accessToken: 'x' }),
    });

    await apiFetch('/auth/login', {
      method: 'POST',
      body: { identifier: 'a', password: 'b' },
      auth: false,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('throws ApiError with server message on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Account not provisioned' }),
    });

    await expect(apiFetch('/auth/login', { auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Account not provisioned',
    } satisfies Partial<ApiError>);
  });

  it('throws ApiError with status fallback when body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    });

    await expect(apiFetch('/health', { auth: false })).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'Request failed (502)',
    } satisfies Partial<ApiError>);
  });

  it('returns undefined for empty success body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    });

    const actual = await apiFetch<void>('/health', { auth: false });
    expect(actual).toBeUndefined();
  });
});
