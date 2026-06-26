import { apiClient, storeTokens, clearTokens } from './client';
import type {
  ApiResponse,
  AuthResult,
  LoginPayload,
  RegisterPayload,
  User,
} from '../types';

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiResponse<AuthResult>>(
    '/api/v1/auth/register',
    payload
  );
  const { user, tokens } = res.data;
  storeTokens(tokens.accessToken, tokens.refreshToken);
  return { user, tokens };
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const res = await apiClient.post<ApiResponse<AuthResult>>(
    '/api/v1/auth/login',
    payload
  );
  const { user, tokens } = res.data;
  storeTokens(tokens.accessToken, tokens.refreshToken);
  return { user, tokens };
}

export async function getProfile(): Promise<User> {
  const res = await apiClient.get<ApiResponse<{ user: User }>>(
    '/api/v1/auth/me',
    true
  );
  return res.data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/logout', null, true);
  } finally {
    clearTokens();
  }
}
