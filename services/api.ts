/**
 * API client for Club League backend.
 * Uses VITE_API_URL when set (e.g. http://localhost:3000).
 */

const TOKEN_KEY = 'club_league_token';

export function getApiUrl(): string | undefined {
  return (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

type FetchApiOptions = Omit<RequestInit, 'body'> & { body?: object };

export async function fetchApi<T = unknown>(path: string, options: FetchApiOptions = {}): Promise<T> {
  const base = getApiUrl();
  if (!base) throw new Error('VITE_API_URL not set');
  const { method = 'GET', body, ...rest } = options;
  const url = path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    ...rest,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
