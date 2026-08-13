import type { ApiErrorBody } from './types';

/** Relative base — Vite proxy (dev) / nginx (prod) → gateway :8080 */
export const BASE_URL = '/api';

export const TOKEN_KEY = 'wishly_access_token';

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  setToken(null);
}

function redirectToLoginOn401(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/w/')) {
    return;
  }
  const returnUrl = encodeURIComponent(path + window.location.search);
  window.location.assign(`/login?returnUrl=${returnUrl}`);
}

type ApiFetchOptions = RequestInit & {
  /** Default true. Set false for public endpoints. */
  auth?: boolean;
  /** Skip JSON Content-Type (e.g. FormData upload). */
  rawBody?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, rawBody = false, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (!rawBody && rest.body != null && !(rest.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const body = (data && typeof data === 'object' ? data : null) as ApiErrorBody | null;
    const message =
      body?.message || body?.error || (typeof data === 'string' && data) || `HTTP ${res.status}`;
    if (res.status === 401) {
      clearToken();
      redirectToLoginOn401();
    }
    throw new ApiError(res.status, String(message), body);
  }

  return data as T;
}

export function errorMessage(err: unknown, fallback = 'Ошибка запроса'): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
