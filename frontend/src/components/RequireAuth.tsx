import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();
  const token = getToken();

  if (!ready) {
    return <p className="p-8 text-center text-sm text-slate-500">Загрузка…</p>;
  }

  if (!token || !isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, ready } = useAuth();
  const location = useLocation();
  const token = getToken();

  if (!ready) {
    return <p className="p-8 text-center text-sm text-slate-500">Загрузка…</p>;
  }

  if (!token || !isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/wishlists" replace />;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) {
    return <p className="p-8 text-center text-sm text-slate-500">Загрузка…</p>;
  }
  if (isAuthenticated && getToken()) return <Navigate to="/wishlists" replace />;
  return <>{children}</>;
}
