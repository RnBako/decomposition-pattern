import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SecondaryButton } from '../components/ui';

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-sm font-semibold text-teal-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Страница не найдена</h1>
      <p className="mt-2 text-sm text-slate-500">Проверьте адрес или вернитесь в приложение</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {isAuthenticated ? (
          <Link to="/wishlists">
            <PrimaryButton>К вишлистам</PrimaryButton>
          </Link>
        ) : (
          <Link to="/login">
            <PrimaryButton>Войти</PrimaryButton>
          </Link>
        )}
        <Link to="/">
          <SecondaryButton>На главную</SecondaryButton>
        </Link>
      </div>
    </div>
  );
}
