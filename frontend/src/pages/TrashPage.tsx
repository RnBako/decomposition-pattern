import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Gift, WishlistDetail } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { formatRub } from '../lib/format';
import { Badge, EmptyState, PageHeader, SecondaryButton } from '../components/ui';

export function TrashPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [detail, setDetail] = useState<WishlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const wl = await wishlistsApi.getWishlist(id, { includeDeletedGifts: true });
      setDetail(wl);
    } catch (err) {
      setDetail(null);
      setError(errorMessage(err, 'Вишлист не найден'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  if (error || !detail) return <EmptyState title={error || 'Вишлист не найден'} />;
  if (!user || (detail.owner_id !== user.id && user.role !== 'admin')) {
    return <Navigate to="/wishlists" replace />;
  }

  const deletedGifts: Gift[] = (detail.gifts ?? []).filter((g) => !!g.deleted_at);

  const restoreGift = async (giftId: string) => {
    try {
      await wishlistsApi.restoreGift(detail.id, giftId);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось восстановить подарок'));
    }
  };

  const restoreWishlist = async () => {
    try {
      await wishlistsApi.restoreWishlist(detail.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось восстановить вишлист'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Удалённые"
        subtitle={detail.title}
        actions={
          <Link to={`/wishlists/${detail.id}`}>
            <SecondaryButton>К вишлисту</SecondaryButton>
          </Link>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {detail.deleted_at && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
          <span>Сам вишлист в soft-delete</span>
          <button type="button" onClick={() => void restoreWishlist()} className="font-medium text-teal-700 underline">
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
                onClick={() => void restoreGift(g.id)}
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
