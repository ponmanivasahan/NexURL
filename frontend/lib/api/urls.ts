import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  ShortUrl,
  CreateUrlPayload,
  CreateUrlResult,
  RedirectInfo,
  UrlAnalytics,
} from '../types';

export async function createShortUrl(
  payload: CreateUrlPayload
): Promise<CreateUrlResult> {
  const res = await apiClient.post<ApiResponse<CreateUrlResult>>(
    '/api/v1/urls',
    payload,
    false
  );
  return res.data;
}

export async function getUserUrls(
  page = 1,
  limit = 10
): Promise<PaginatedResponse<ShortUrl>> {
  return apiClient.get<PaginatedResponse<ShortUrl>>(
    `/api/v1/urls?page=${page}&limit=${limit}`,
    true
  );
}

export async function deleteUrl(shortCode: string): Promise<void> {
  await apiClient.delete(`/api/v1/urls/${shortCode}`, true);
}

export async function getUrlAnalytics(
  shortCode: string
): Promise<ApiResponse<UrlAnalytics>> {
  return apiClient.get<ApiResponse<UrlAnalytics>>(`/api/v1/urls/${shortCode}/analytics`, true);
}

export async function getRedirectInfo(
  shortCode: string
): Promise<RedirectInfo> {
  const res = await apiClient.get<ApiResponse<RedirectInfo>>(
    `/api/v1/redirect/${shortCode}/info`
  );
  return res.data;
}
