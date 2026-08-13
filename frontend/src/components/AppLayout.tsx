import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as notificationsApi from '../api/notifications';
import { errorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-2 py-1 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'text-teal-800 bg-teal-50'
      : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
  }`;

export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBadge(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await notificationsApi.getUnreadCount();
        if (!cancelled) setBadge(res.count);
      } catch (err) {
        if (!cancelled) {
          console.warn(errorMessage(err));
          setBadge(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleLogout = () => {
    void logout().then(() => navigate('/login'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to={isAuthenticated ? '/wishlists' : '/login'} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              W
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Wishly</span>
          </Link>

          {isAuthenticated && user ? (
            <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
              <NavLink to="/wishlists" className={linkClass}>
                Вишлисты
              </NavLink>
              <NavLink to="/notifications" className={linkClass}>
                <span className="inline-flex items-center gap-1">
                  Уведомления
                  {badge > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-semibold text-white">
                      {badge}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/my-bookings" className={linkClass}>
                Брони
              </NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={linkClass}>
                  Админ
                </NavLink>
              )}
              <span className="hidden text-xs text-slate-400 sm:inline sm:ml-2">
                {user.display_name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Выход
              </button>
            </nav>
          ) : (
            <nav className="flex gap-2 text-sm">
              <Link to="/login" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                Вход
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-teal-700 px-3 py-1.5 font-medium text-white hover:bg-teal-800"
              >
                Регистрация
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Wishly · live API · /api → gateway :8080
      </footer>
    </div>
  );
}

/** Minimal chrome for public share / auth pages */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-teal-50/40 text-slate-900">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
              W
            </span>
            <span className="text-lg font-semibold">Wishly</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
