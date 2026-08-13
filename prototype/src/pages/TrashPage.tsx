import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatRub } from '../data/mock';
import { store } from '../lib/store';
import { Badge, EmptyState, PageHeader, SecondaryButton } from '../components/ui';

export function TrashPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, bump] = useState(0);
  const wishlist = store.wishlists.find((w) => w.id === id);

  if (!wishlist) return <EmptyState title="Вишлист не найден" />;
  if (!user || (wishlist.owner_id !== user.id && user.role !== 'admin')) {
    return <Navigate to="/wishlists" replace />;
  }

  const deletedGifts = store.gifts.filter((g) => g.wishlist_id === wishlist.id && g.deleted_at);

  const restoreGift = (giftId: string) => {
    const g = store.gifts.find((x) => x.id === giftId);
    if (g) {
      g.deleted_at = null;
      bump((n) => n + 1);
    }
  };

  const restoreWishlist = () => {
    wishlist.deleted_at = null;
    bump((n) => n + 1);
  };

  return (
    <div>
      <PageHeader
        title="Удалённые"
        subtitle={wishlist.title}
        actions={
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton>К вишлисту</SecondaryButton>
          </Link>
        }
      />

      {wishlist.deleted_at && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
          <span>Сам вишлист в soft-delete</span>
          <button type="button" onClick={restoreWishlist} className="font-medium text-teal-700 underline">
            Восстановить вишлист
          </button>
        </div>
      )}

      {deletedGifts.length === 0 ? (
        <EmptyState title="Нет удалённых подарков" />
      ) : (
        <ul className="space-y-3">
          {deletedGifts.map((g) => (
            <li
              key={g.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{g.title}</span>
                  <Badge tone="danger">Удалён</Badge>
                </div>
                <p className="text-sm text-slate-500">{formatRub(g.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => restoreGift(g.id)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
              >
                Восстановить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
