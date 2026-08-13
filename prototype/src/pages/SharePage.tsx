import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRub, getUser } from '../data/mock';
import { store, uid } from '../lib/store';
import { Badge, EmptyState, PrimaryButton, SecondaryButton } from '../components/ui';

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [, bump] = useState(0);
  const [confirmGiftId, setConfirmGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const share = store.shareLinks.find((s) => s.token === token);
  const wishlist = share ? store.wishlists.find((w) => w.id === share.wishlist_id) : undefined;

  if (!share || !share.is_active || !wishlist || wishlist.deleted_at) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Ссылка недоступна</h1>
        <p className="mt-2 text-sm text-slate-500">
          Токен отозван, вишлист удалён или ссылка не существует.
        </p>
        <Link to="/login" className="mt-6 inline-block text-teal-700 hover:underline">
          Войти в Wishly
        </Link>
      </div>
    );
  }

  const owner = getUser(wishlist.owner_id);
  const gifts = store.gifts.filter((g) => g.wishlist_id === wishlist.id && !g.deleted_at);
  const deadlinePassed = wishlist.booking_deadline < new Date().toISOString().slice(0, 10);
  const isOwner = user?.id === wishlist.owner_id;

  const requestBook = (giftId: string) => {
    setMessage('');
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=${encodeURIComponent(`/w/${token}`)}`);
      return;
    }
    if (isOwner) {
      setMessage('Нельзя бронировать подарок в своём вишлисте');
      return;
    }
    if (deadlinePassed) {
      setMessage('Дедлайн бронирования истёк');
      return;
    }
    const existing = store.bookings.find((b) => b.gift_id === giftId && b.status === 'active');
    if (existing) {
      setMessage('Подарок уже забронирован');
      return;
    }
    setConfirmGiftId(giftId);
  };

  const confirmBook = () => {
    if (!user || !confirmGiftId) return;
    const now = new Date().toISOString();
    store.bookings.push({
      id: uid('b'),
      gift_id: confirmGiftId,
      booker_id: user.id,
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    store.notifications.unshift({
      id: uid('n'),
      recipient_id: wishlist.owner_id,
      type: 'booking_created',
      payload: {
        wishlist_id: wishlist.id,
        gift_id: confirmGiftId,
        booker_id: user.id,
      },
      channel_flags: { in_app: true, email: true },
      read_at: null,
      created_at: now,
    });
    setConfirmGiftId(null);
    setMessage('Подарок забронирован! Владелец получит уведомление.');
    bump((n) => n + 1);
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-teal-700 to-slate-800 px-6 py-8 text-white">
          <p className="text-sm text-teal-100">Вишлист · Wishly</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{wishlist.title}</h1>
          {wishlist.description && (
            <p className="mt-2 text-sm text-teal-50/90">{wishlist.description}</p>
          )}
          <p className="mt-4 text-xs text-teal-100/80">
            {owner?.display_name} · событие {formatDate(wishlist.event_date)} · бронь до{' '}
            {formatDate(wishlist.booking_deadline)}
          </p>
        </div>
        <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          Имена бронирующих скрыты · комментарии недоступны на публичной странице
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Чтобы забронировать подарок,{' '}
          <Link to={`/login?returnUrl=${encodeURIComponent(`/w/${token}`)}`} className="font-medium underline">
            войдите
          </Link>{' '}
          или{' '}
          <Link to={`/register?returnUrl=${encodeURIComponent(`/w/${token}`)}`} className="font-medium underline">
            зарегистрируйтесь
          </Link>
          .
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900 ring-1 ring-teal-100">
          {message}
        </div>
      )}

      {deadlinePassed && (
        <div className="mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Дедлайн бронирования истёк — новые брони недоступны.
        </div>
      )}

      {gifts.length === 0 ? (
        <EmptyState title="В этом вишлисте пока нет подарков" />
      ) : (
        <ul className="space-y-3">
          {gifts.map((g) => {
            const booked = store.bookings.some((b) => b.gift_id === g.id && b.status === 'active');
            return (
              <li key={g.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {g.image_url ? (
                    <img src={g.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">Нет фото</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {booked ? (
                      <Badge tone="warning">Забронировано</Badge>
                    ) : (
                      <>
                        <Badge tone="success">Свободен</Badge>
                        <PrimaryButton
                          className="!py-1.5 !text-xs"
                          disabled={deadlinePassed || isOwner}
                          onClick={() => requestBook(g.id)}
                        >
                          Забронировать
                        </PrimaryButton>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmGiftId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Подтвердить бронь?</h2>
            <p className="mt-2 text-sm text-slate-500">
              Другие гости увидят статус «Забронировано», ваше имя — только владельцу.
            </p>
            <div className="mt-6 flex gap-2">
              <PrimaryButton onClick={confirmBook} className="flex-1">
                Забронировать
              </PrimaryButton>
              <SecondaryButton onClick={() => setConfirmGiftId(null)} className="flex-1">
                Отмена
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
