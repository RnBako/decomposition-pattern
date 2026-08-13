import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { WishlistSummary } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import { Badge, EmptyState, PageHeader, PrimaryButton } from '../components/ui';

export function WishlistsPage() {
  const { user } = useAuth();
  const [showDeleted, setShowDeleted] = useState(false);
  const [items, setItems] = useState<WishlistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (includeDeleted: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await wishlistsApi.listWishlists(includeDeleted);
      setItems(res.items);
    } catch (err) {
      setItems([]);
      setError(errorMessage(err, 'Не удалось загрузить вишлисты'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(showDeleted);
  }, [showDeleted, user?.id]);

  const restore = async (id: string) => {
    try {
      await wishlistsApi.restoreWishlist(id);
      await load(true);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось восстановить'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Мои вишлисты"
        subtitle="Данные с API · до 20 вишлистов"
        actions={
          !showDeleted ? (
            <Link to="/wishlists/new">
              <PrimaryButton>Создать вишлист</PrimaryButton>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowDeleted(false)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !showDeleted ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          Активные
        </button>
        <button
          type="button"
          onClick={() => setShowDeleted(true)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            showDeleted ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          Удалённые
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={showDeleted ? 'Нет удалённых вишлистов' : 'Пока нет вишлистов'}
          hint={!showDeleted ? 'Создайте первый список желаний' : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((w) => {
            const giftCount = w.gifts_count ?? 0;
            return (
              <li key={w.id}>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <Link to={`/wishlists/${w.id}`} className="min-w-0 flex-1 hover:opacity-90">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900">{w.title}</h2>
                      {w.deleted_at && <Badge tone="danger">Удалён</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Событие {formatDate(w.event_date)} · бронь до {formatDate(w.booking_deadline)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{giftCount} подарков</p>
                  </Link>
                  {showDeleted ? (
                    <button
                      type="button"
                      onClick={() => void restore(w.id)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      Восстановить
                    </button>
                  ) : (
                    <Link
                      to={`/wishlists/${w.id}`}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      Открыть →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
