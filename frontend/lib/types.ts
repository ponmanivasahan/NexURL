// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

// ─── URLs ───────────────────────────────────────────────────────────────────

export interface ShortUrl {
  id: number;
  shortUrl: string;
  originalUrl: string;
  shortCode: string;
  customAlias: string | null;
  isCustom: boolean;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUrlPayload {
  url: string;
  customAlias?: string;
  expiresAt?: string;
}

export interface CreateUrlResult {
  shortUrl: string;
  originalUrl: string;
  shortCode: string;
  isCustom: boolean;
  createdAt: string;
  expiresAt: string | null;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface ClickEvent {
  hour: string;
  clicks: number;
}

export interface ReferrerStat {
  referrer: string;
  clicks: number;
}

export interface BrowserStat {
  browser: string;
  count: number;
}

export interface UrlAnalytics {
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
  metrics: {
    totalClicks: number;
    uniqueVisitors: number;
    timeline: ClickEvent[];
    referrers: ReferrerStat[];
    browsers: BrowserStat[];
    os: Array<{ os: string; count: number }>;
    devices: Array<{ device: string; count: number }>;
  };
}

export interface RedirectInfo {
  shortCode: string;
  destinationUrl: string;
  redirectType: number;
  redirectMessage: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  clickCount: number;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── API Response Wrappers ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  timestamp: string;
}
