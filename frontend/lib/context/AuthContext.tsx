'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, AuthTokens, LoginPayload, RegisterPayload } from '../types';
import * as authApi from '../api/auth';
import { getStoredAccessToken, clearTokens } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // ─── Load profile on mount if token exists ──────────────────────────────
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    authApi
      .getProfile()
      .then((user) => {
        setState({ user, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload) => {
    const result = await authApi.login(payload);
    setState({
      user: result.user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // ─── Register ───────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    setState({
      user: result.user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
