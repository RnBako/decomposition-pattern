import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Field, PrimaryButton, inputClass } from '../components/ui';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnUrl = params.get('returnUrl') || '/wishlists';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await register({ email, password, display_name: displayName });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(returnUrl.startsWith('/') ? returnUrl : '/wishlists');
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Регистрация</h1>
      <p className="mt-1 text-sm text-slate-500">Создайте аккаунт, чтобы бронировать подарки</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Имя">
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Как к вам обращаться"
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Пароль" hint="Минимум 8 символов (требование API)">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <PrimaryButton type="submit" className="w-full" disabled={pending}>
          {pending ? 'Создание…' : 'Создать аккаунт'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Уже есть аккаунт?{' '}
        <Link
          to={`/login${returnUrl !== '/wishlists' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
          className="font-medium text-teal-700 hover:underline"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
