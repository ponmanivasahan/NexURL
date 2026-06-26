import type { ApiError } from '../types';

// ─── Token Storage ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'nexurl_access_token';
const REFRESH_KEY = 'nexurl_refresh_token';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── API Error Class ────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  status: number;
  errors?: string[];

  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

// ─── Token Refresh Logic ────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const json = await res.json();
    const tokens = json.data?.tokens;
    if (tokens?.accessToken) {
      storeTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    }

    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = attemptTokenRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

// ─── Base URL ───────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

// ─── Core Fetch Wrapper ─────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, requireAuth = false } = options;

  const url = `${getBaseUrl()}${endpoint}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Attach auth token if required or available
  const token = getStoredAccessToken();
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new ApiRequestError('Authentication required', 401);
  }

  let res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  // ── 401 Intercept: attempt refresh and retry ─────────────────────────────
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      // Refresh failed → redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiRequestError('Session expired. Please log in again.', 401);
    }
  }

  // ── Parse Response ───────────────────────────────────────────────────────
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errorData = json as ApiError | null;
    throw new ApiRequestError(
      errorData?.message || `Request failed (${res.status})`,
      res.status,
      errorData?.errors || undefined
    );
  }

  return json as T;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(endpoint: string, requireAuth = false): Promise<T> {
    return request<T>(endpoint, { method: 'GET', requireAuth });
  },

  post<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body, requireAuth });
  },

  put<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body, requireAuth });
  },

  delete<T>(endpoint: string, requireAuth = false): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', requireAuth });
  },
};
