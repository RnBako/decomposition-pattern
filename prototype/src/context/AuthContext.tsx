import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { users, type User } from '../data/mock';

const SESSION_KEY = 'wishly_session_user_id';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  register: (data: {
    email: string;
    password: string;
    display_name: string;
  }) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): User | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return users.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

function persist(user: User) {
  localStorage.setItem(SESSION_KEY, user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readSession());

  const login = useCallback((email: string, password: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      return { ok: false as const, error: 'Введите email и пароль' };
    }

    const found = users.find((u) => u.email.toLowerCase() === trimmed);
    if (found) {
      if (found.password !== password) {
        return { ok: false as const, error: 'Неверный email или пароль' };
      }
      persist(found);
      setUser(found);
      return { ok: true as const };
    }

    // Demo: unknown email + password ≥ 4 → enter as booker
    if (password.length >= 4) {
      const demo = users.find((u) => u.id === 'u-booker')!;
      persist(demo);
      setUser(demo);
      return { ok: true as const };
    }

    return { ok: false as const, error: 'Неверный email или пароль' };
  }, []);

  const register = useCallback(
    (data: { email: string; password: string; display_name: string }) => {
      const email = data.email.trim().toLowerCase();
      if (!email || !data.password || !data.display_name.trim()) {
        return { ok: false as const, error: 'Заполните все поля' };
      }
      if (data.password.length < 6) {
        return { ok: false as const, error: 'Пароль не менее 6 символов' };
      }
      if (users.some((u) => u.email.toLowerCase() === email)) {
        return { ok: false as const, error: 'Такой email уже зарегистрирован' };
      }
      const demo = users.find((u) => u.id === 'u-booker')!;
      persist(demo);
      setUser(demo);
      return { ok: true as const };
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
