import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_CREDENTIALS } from '../data/demo';
import { Field, PrimaryButton, inputClass } from '../components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnUrl = params.get('returnUrl') || '/wishlists';

  const [email, setEmail] = useState<string>(DEMO_CREDENTIALS[0].email);
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS[0].password);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError('');
    const result = await login(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(returnUrl.startsWith('/') ? returnUrl : '/wishlists');
  };

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="mt-1 text-sm text-slate-500">Войдите, чтобы бронировать подарки и управлять вишлистами</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Пароль">
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}
        <PrimaryButton type="submit" className="w-full" disabled={pending}>
          {pending ? 'Вход…' : 'Войти'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Нет аккаунта?{' '}
        <Link
          to={`/register${returnUrl !== '/wishlists' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
          className="font-medium text-teal-700 hover:underline"
        >
          Регистрация
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Демо-доступ</p>
        <ul className="mt-3 space-y-2">
          {DEMO_CREDENTIALS.map((c) => (
            <li key={c.email}>
              <button
                type="button"
                onClick={() => fill(c.email, c.password)}
                className="w-full rounded-lg bg-white px-3 py-2 text-left text-sm shadow-sm ring-1 ring-slate-100 transition hover:ring-teal-300"
              >
                <span className="font-medium text-slate-800">{c.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {c.email} / {c.password}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Админ сидируется из docker compose (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Обычные пользователи — через регистрацию.
        </p>
      </div>
    </div>
  );
}
