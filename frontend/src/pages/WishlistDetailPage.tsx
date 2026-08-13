import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import { errorMessage } from '../api/client';
import type { Booking, Comment, Gift, ShareLink, WishlistDetail } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRub } from '../lib/format';
import {
  Badge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  inputClass,
} from '../components/ui';

export function WishlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<WishlistDetail | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCat, setNewCat] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [wl, bookingRes, commentRes] = await Promise.all([
        wishlistsApi.getWishlist(id),
        bookingsApi.listBookingsByWishlist(id, 'active').catch(() => ({ items: [] as Booking[] })),
        wishlistsApi.listWishlistComments(id).catch(() => ({ items: [] as Comment[] })),
      ]);
      setDetail(wl);
      setBookings(bookingRes.items ?? []);
      setComments(wishlistsApi.asList(commentRes));
    } catch (err) {
      setDetail(null);
      setError(errorMessage(err, 'Вишлист не найден'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  if (error || !detail) return <EmptyState title={error || 'Вишлист не найден'} hint="Возможно, ссылка устарела" />;

  const wishlist = detail;
  const isOwner = !!(user && wishlist.owner_id === user.id);
  const isAdmin = user?.role === 'admin';

  if (!isOwner && !isAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Это чужой вишлист. Откройте публичную ссылку владельца или вернитесь к{' '}
        <Link to="/wishlists" className="font-medium underline">
          своим спискам
        </Link>
        .
      </div>
    );
  }

  const liveCats = [...(wishlist.categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const gifts = (wishlist.gifts ?? []).filter((g) => !g.deleted_at);
  const share: ShareLink | null | undefined = wishlist.share_link;

  const softDeleteWishlist = async () => {
    try {
      await wishlistsApi.deleteWishlist(wishlist.id);
      navigate('/wishlists');
    } catch (err) {
      setError(errorMessage(err, 'Не удалось удалить'));
    }
  };

  const restoreWishlist = async () => {
    try {
      await wishlistsApi.restoreWishlist(wishlist.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось восстановить'));
    }
  };

  const softDeleteGift = async (giftId: string) => {
    try {
      await wishlistsApi.deleteGift(wishlist.id, giftId);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось удалить подарок'));
    }
  };

  const cancelBooking = async (giftId: string) => {
    const b = bookings.find((x) => x.gift_id === giftId && x.status === 'active');
    if (!b) return;
    try {
      if (user?.role === 'admin' && b.booker_id !== user.id) {
        await bookingsApi.adminCancelBooking(b.id);
      } else {
        await bookingsApi.cancelBooking(b.id);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось снять бронь'));
    }
  };

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    try {
      await wishlistsApi.createCategory(wishlist.id, { name: newCat.trim() });
      setNewCat('');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось добавить категорию'));
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    try {
      await wishlistsApi.createWishlistComment(wishlist.id, { body: commentBody.trim() });
      setCommentBody('');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось добавить комментарий'));
    }
  };

  const copyShare = async () => {
    if (!share) return;
    const url = `${window.location.origin}/w/${share.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const revokeShare = async () => {
    try {
      await wishlistsApi.revokeShareLink(wishlist.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отозвать ссылку'));
    }
  };

  const issueShare = async () => {
    try {
      await wishlistsApi.createShareLink(wishlist.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось выпустить ссылку'));
    }
  };

  const grouped = liveCats.map((cat) => ({
    cat,
    gifts: gifts.filter((g) => g.category_id === cat.id),
  }));
  const uncategorized = gifts.filter((g) => !g.category_id);
  const bookingByGift = new Map(bookings.filter((b) => b.status === 'active').map((b) => [b.gift_id, b]));

  return (
    <div>
      <PageHeader
        title={wishlist.title}
        subtitle={wishlist.description ?? undefined}
        actions={
          isOwner && !wishlist.deleted_at ? (
            <>
              <Link to={`/wishlists/${wishlist.id}/edit`}>
                <SecondaryButton>Редактировать</SecondaryButton>
              </Link>
              <Link to={`/wishlists/${wishlist.id}/gifts/new`}>
                <PrimaryButton>Добавить подарок</PrimaryButton>
              </Link>
            </>
          ) : undefined
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {wishlist.deleted_at && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>Вишлист удалён (soft delete)</span>
          <button type="button" onClick={() => void restoreWishlist()} className="font-medium underline">
            Восстановить
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
          Событие: <strong>{formatDate(wishlist.event_date)}</strong>
        </span>
        <span className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
          Бронь до: <strong>{formatDate(wishlist.booking_deadline)}</strong>
        </span>
        <Link
          to={`/wishlists/${wishlist.id}/trash`}
          className="rounded-lg px-3 py-1.5 text-teal-700 hover:bg-teal-50"
        >
          Удалённые →
        </Link>
      </div>

      {isOwner && !wishlist.deleted_at && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-slate-900">Поделиться</h2>
          {share?.is_active ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
                /w/{share.token}
              </code>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => void copyShare()}>
                  {copied ? 'Скопировано' : 'Копировать'}
                </SecondaryButton>
                <Link
                  to={`/w/${share.token}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Открыть
                </Link>
                <button type="button" onClick={() => void revokeShare()} className="text-sm text-rose-600 hover:underline">
                  Отозвать
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-slate-500">Активной ссылки нет</p>
              <PrimaryButton className="mt-2" onClick={() => void issueShare()}>
                Выпустить ссылку
              </PrimaryButton>
            </div>
          )}
          {share?.is_active && (
            <button type="button" onClick={() => void issueShare()} className="mt-2 text-xs text-slate-500 hover:underline">
              Выпустить новую (старая отзовётся)
            </button>
          )}
        </section>
      )}

      {isOwner && !wishlist.deleted_at && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Категории</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {liveCats.map((c) => (
              <Badge key={c.id} tone="info">
                {c.name}
              </Badge>
            ))}
            {liveCats.length === 0 && <span className="text-sm text-slate-400">Пока нет</span>}
          </div>
          <form onSubmit={(e) => void addCategory(e)} className="flex gap-2">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Новая категория"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
            />
            <SecondaryButton type="submit">Добавить</SecondaryButton>
          </form>
        </section>
      )}

      <section className="space-y-8">
        {grouped.map(({ cat, gifts: catGifts }) =>
          catGifts.length > 0 ? (
            <div key={cat.id}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{cat.name}</h3>
              <GiftList
                gifts={catGifts}
                bookingByGift={bookingByGift}
                onCancelBooking={(giftId) => void cancelBooking(giftId)}
                onDelete={(giftId) => void softDeleteGift(giftId)}
                wishlistId={wishlist.id}
                canManage={isOwner && !wishlist.deleted_at}
              />
            </div>
          ) : null,
        )}
        {uncategorized.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Без категории</h3>
            <GiftList
              gifts={uncategorized}
              bookingByGift={bookingByGift}
              onCancelBooking={(giftId) => void cancelBooking(giftId)}
              onDelete={(giftId) => void softDeleteGift(giftId)}
              wishlistId={wishlist.id}
              canManage={isOwner && !wishlist.deleted_at}
            />
          </div>
        )}
        {gifts.length === 0 && <EmptyState title="Подарков пока нет" hint="Добавьте первый подарок" />}
      </section>

      {isOwner && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Комментарии (только владелец)</h2>
          <ul className="mb-4 space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-100">
                <p className="text-slate-800">{c.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {c.author_display_name ?? 'Автор'}
                  {c.gift_id ? ' · к подарку' : ''}
                </p>
              </li>
            ))}
            {comments.length === 0 && <li className="text-sm text-slate-400">Комментариев нет</li>}
          </ul>
          {!wishlist.deleted_at && (
            <form onSubmit={(e) => void addComment(e)} className="flex flex-col gap-2 sm:flex-row">
              <input
                className={inputClass}
                placeholder="Заметка к вишлисту…"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <PrimaryButton type="submit">Добавить</PrimaryButton>
            </form>
          )}
        </section>
      )}

      {isOwner && !wishlist.deleted_at && (
        <div className="mt-12 border-t border-slate-200 pt-6">
          <button type="button" onClick={() => void softDeleteWishlist()} className="text-sm text-rose-600 hover:underline">
            Удалить вишлист (soft delete)
          </button>
        </div>
      )}
    </div>
  );
}

function GiftList({
  gifts,
  bookingByGift,
  onCancelBooking,
  onDelete,
  wishlistId,
  canManage,
}: {
  gifts: Gift[];
  bookingByGift: Map<string, Booking>;
  onCancelBooking: (id: string) => void;
  onDelete: (id: string) => void;
  wishlistId: string;
  canManage: boolean;
}) {
  return (
    <ul className="space-y-3">
      {gifts.map((g) => {
        const booking = bookingByGift.get(g.id);
        const occupied = !!booking || !!g.is_occupied;
        return (
          <li key={g.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {g.image_url ? (
                <img src={g.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Нет фото</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-slate-900 hover:text-teal-700"
                  >
                    {g.title}
                  </a>
                  <p className="mt-0.5 text-sm font-semibold text-teal-800">{formatRub(g.price)}</p>
                  {g.notes && <p className="mt-1 text-xs text-slate-500">{g.notes}</p>}
                </div>
                {occupied ? (
                  <Badge tone="warning">
                    Забронировано: {booking?.booker_display_name ?? '—'}
                  </Badge>
                ) : (
                  <Badge tone="success">Свободен</Badge>
                )}
              </div>
              {canManage && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Link
                    to={`/wishlists/${wishlistId}/gifts/${g.id}/edit`}
                    className="text-teal-700 hover:underline"
                  >
                    Изменить
                  </Link>
                  {booking && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking(g.id)}
                      className="text-amber-700 hover:underline"
                    >
                      Снять бронь
                    </button>
                  )}
                  <button type="button" onClick={() => onDelete(g.id)} className="text-rose-600 hover:underline">
                    Удалить
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
