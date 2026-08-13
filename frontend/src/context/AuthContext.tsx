import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as authApi from '../api/auth';
import { ApiError, clearToken, getToken, setToken } from '../api/client';
import type { UserPublic } from '../api/types';

export type AuthUser = UserPublic;

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (data: {
    email: string;
    password: string;
    display_name: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function authFailMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return 'Неверный email или пароль';
    if (err.status === 409) return 'Такой email уже зарегистрирован';
    if (err.status === 400) return err.message || 'Проверьте введённые данные';
    if (err.status === 0 || err.status >= 500) return 'Сервер недоступен. Попробуйте позже.';
    return err.message || fallback;
  }
  if (err instanceof TypeError) return 'Сервер недоступен. Проверьте, что API Gateway запущен.';
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      try {
        const me = await authApi.getMe();
        if (!cancelled) setUser(me);
      } catch {
        clearToken();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email: email.trim(), password });
      setToken(res.access_token);
      setUser(res.user);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: authFailMessage(err, 'Не удалось войти') };
    }
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; display_name: string }) => {
      const email = data.email.trim();
      const display_name = data.display_name.trim();
      if (!email || !data.password || !display_name) {
        return { ok: false as const, error: 'Заполните все поля' };
      }
      if (data.password.length < 8) {
        return { ok: false as const, error: 'Пароль не менее 8 символов' };
      }
      try {
        const res = await authApi.register({
          email,
          password: data.password,
          display_name,
        });
        setToken(res.access_token);
        setUser(res.user);
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, error: authFailMessage(err, 'Не удалось зарегистрироваться') };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await authApi.logout();
      } catch {
        /* ignore */
      }
    }
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!getToken() && !!user,
      ready,
      login,
      register,
      logout,
    }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
