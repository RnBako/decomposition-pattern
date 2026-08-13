import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRub, getUser, type Gift } from '../data/mock';
import { store, uid } from '../lib/store';
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
  const [, bump] = useState(0);
  const [newCat, setNewCat] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [copied, setCopied] = useState(false);

  const wishlist = store.wishlists.find((w) => w.id === id);
  const isOwner = !!(user && wishlist && wishlist.owner_id === user.id);
  const isAdmin = user?.role === 'admin';

  const liveCats = store.categories
    .filter((c) => c.wishlist_id === id)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!wishlist) {
    return <EmptyState title="Вишлист не найден" hint="Возможно, ссылка устарела" />;
  }

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

  const gifts = store.gifts.filter((g) => g.wishlist_id === wishlist.id && !g.deleted_at);
  const comments = store.comments.filter((c) => c.wishlist_id === wishlist.id && !c.deleted_at);
  const share = store.shareLinks.find((s) => s.wishlist_id === wishlist.id && s.is_active);

  const softDeleteWishlist = () => {
    wishlist.deleted_at = new Date().toISOString();
    navigate('/wishlists');
  };

  const restoreWishlist = () => {
    wishlist.deleted_at = null;
    bump((n) => n + 1);
  };

  const softDeleteGift = (giftId: string) => {
    const g = store.gifts.find((x) => x.id === giftId);
    if (g) {
      g.deleted_at = new Date().toISOString();
      bump((n) => n + 1);
    }
  };

  const cancelBooking = (giftId: string) => {
    const b = store.bookings.find((x) => x.gift_id === giftId && x.status === 'active');
    if (b && user) {
      b.status = 'cancelled';
      b.cancelled_at = new Date().toISOString();
      b.cancelled_by_id = user.id;
      b.updated_at = b.cancelled_at;
      store.notifications.unshift({
        id: uid('n'),
        recipient_id: wishlist.owner_id,
        type: 'booking_cancelled',
        payload: { wishlist_id: wishlist.id, gift_id: giftId, booker_id: b.booker_id },
        channel_flags: { in_app: true, email: true },
        read_at: null,
        created_at: new Date().toISOString(),
      });
      bump((n) => n + 1);
    }
  };

  const addCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    store.categories.push({
      id: uid('cat'),
      wishlist_id: wishlist.id,
      name: newCat.trim(),
      sort_order: store.categories.filter((c) => c.wishlist_id === wishlist.id).length + 1,
    });
    setNewCat('');
    bump((n) => n + 1);
  };

  const addComment = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !commentBody.trim()) return;
    store.comments.push({
      id: uid('c'),
      author_id: user.id,
      wishlist_id: wishlist.id,
      gift_id: null,
      body: commentBody.trim(),
      created_at: new Date().toISOString(),
    });
    setCommentBody('');
    bump((n) => n + 1);
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

  const revokeShare = () => {
    if (!share) return;
    share.is_active = false;
    share.revoked_at = new Date().toISOString();
    bump((n) => n + 1);
  };

  const issueShare = () => {
    store.shareLinks.forEach((s) => {
      if (s.wishlist_id === wishlist.id && s.is_active) {
        s.is_active = false;
        s.revoked_at = new Date().toISOString();
      }
    });
    store.shareLinks.push({
      id: uid('sl'),
      wishlist_id: wishlist.id,
      token: `share-${Math.random().toString(36).slice(2, 10)}`,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    bump((n) => n + 1);
  };

  const grouped = liveCats.map((cat) => ({
    cat,
    gifts: gifts.filter((g) => g.category_id === cat.id),
  }));
  const uncategorized = gifts.filter((g) => !g.category_id);

  return (
    <div>
      <PageHeader
        title={wishlist.title}
        subtitle={wishlist.description}
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

      {wishlist.deleted_at && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>Вишлист удалён (soft delete)</span>
          <button type="button" onClick={restoreWishlist} className="font-medium underline">
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
          {share ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
                /w/{share.token}
              </code>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={copyShare}>{copied ? 'Скопировано' : 'Копировать'}</SecondaryButton>
                <Link
                  to={`/w/${share.token}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Открыть
                </Link>
                <button type="button" onClick={revokeShare} className="text-sm text-rose-600 hover:underline">
                  Отозвать
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-slate-500">Активной ссылки нет</p>
              <PrimaryButton className="mt-2" onClick={issueShare}>
                Выпустить ссылку
              </PrimaryButton>
            </div>
          )}
          {share && (
            <button type="button" onClick={issueShare} className="mt-2 text-xs text-slate-500 hover:underline">
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
          <form onSubmit={addCategory} className="flex gap-2">
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
                onCancelBooking={cancelBooking}
                onDelete={softDeleteGift}
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
              onCancelBooking={cancelBooking}
              onDelete={softDeleteGift}
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
                  {getUser(c.author_id)?.display_name}
                  {c.gift_id ? ' · к подарку' : ''}
                </p>
              </li>
            ))}
            {comments.length === 0 && <li className="text-sm text-slate-400">Комментариев нет</li>}
          </ul>
          {!wishlist.deleted_at && (
            <form onSubmit={addComment} className="flex flex-col gap-2 sm:flex-row">
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
          <button type="button" onClick={softDeleteWishlist} className="text-sm text-rose-600 hover:underline">
            Удалить вишлист (soft delete)
          </button>
        </div>
      )}
    </div>
  );
}

function GiftList({
  gifts,
  onCancelBooking,
  onDelete,
  wishlistId,
  canManage,
}: {
  gifts: Gift[];
  onCancelBooking: (id: string) => void;
  onDelete: (id: string) => void;
  wishlistId: string;
  canManage: boolean;
}) {
  return (
    <ul className="space-y-3">
      {gifts.map((g) => {
        const booking = store.bookings.find((b) => b.gift_id === g.id && b.status === 'active');
        const booker = booking ? getUser(booking.booker_id) : null;
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
                {booking ? (
                  <Badge tone="warning">Забронировано: {booker?.display_name ?? '—'}</Badge>
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
