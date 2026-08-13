import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../data/mock';
import { store } from '../lib/store';
import { Badge, EmptyState, PageHeader, PrimaryButton } from '../components/ui';

export function WishlistsPage() {
  const { user } = useAuth();
  const [showDeleted, setShowDeleted] = useState(false);
  const [, bump] = useState(0);

  const list = useMemo(() => {
    if (!user) return [];
    return store.wishlists.filter((w) => {
      if (w.owner_id !== user.id) return false;
      return showDeleted ? !!w.deleted_at : !w.deleted_at;
    });
  }, [user, showDeleted, bump]);

  const restore = (id: string) => {
    const w = store.wishlists.find((x) => x.id === id);
    if (w) {
      w.deleted_at = null;
      w.updated_at = new Date().toISOString();
      bump((n) => n + 1);
    }
  };

  return (
    <div>
      <PageHeader
        title="Мои вишлисты"
        subtitle="До 20 вишлистов · soft-deleted скрыты по умолчанию"
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

      {list.length === 0 ? (
        <EmptyState
          title={showDeleted ? 'Нет удалённых вишлистов' : 'Пока нет вишлистов'}
          hint={!showDeleted ? 'Создайте первый список желаний' : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((w) => {
            const giftCount = store.gifts.filter((g) => g.wishlist_id === w.id && !g.deleted_at).length;
            const activeBookings = store.bookings.filter(
              (b) =>
                b.status === 'active' &&
                store.gifts.some((g) => g.id === b.gift_id && g.wishlist_id === w.id && !g.deleted_at),
            ).length;

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
                    <p className="mt-1 text-xs text-slate-400">
                      {giftCount} подарков · {activeBookings} броней
                    </p>
                  </Link>
                  {showDeleted ? (
                    <button
                      type="button"
                      onClick={() => restore(w.id)}
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
