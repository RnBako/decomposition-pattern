import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as bookingsApi from '../api/bookings';
import { errorMessage } from '../api/client';
import type { PublicGift, PublicShareView } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRub } from '../lib/format';
import { Badge, EmptyState, PrimaryButton, SecondaryButton } from '../components/ui';

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<PublicShareView | null>(null);
  const [occupied, setOccupied] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmGiftId, setConfirmGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const share = await wishlistsApi.getPublicShare(token);
      setView(share);
      const giftIds = share.gifts.map((g) => g.id);
      if (giftIds.length > 0) {
        try {
          const status = await bookingsApi.getPublicBookingStatus(giftIds);
          setOccupied(
            new Set(
              status.items
                .filter((i) => i.is_booked || i.status === 'booked')
                .map((i) => i.gift_id),
            ),
          );
        } catch {
          setOccupied(new Set(share.gifts.filter((g) => g.is_occupied).map((g) => g.id)));
        }
      } else {
        setOccupied(new Set());
      }
    } catch (err) {
      setView(null);
      setError(errorMessage(err, 'Ссылка недоступна'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  if (loading) return <p className="text-center text-sm text-slate-500">Загрузка…</p>;

  if (error || !view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Ссылка недоступна</h1>
        <p className="mt-2 text-sm text-slate-500">
          {error || 'Токен отозван, вишлист удалён или ссылка не существует.'}
        </p>
        <Link to="/login" className="mt-6 inline-block text-teal-700 hover:underline">
          Войти в Wishly
        </Link>
      </div>
    );
  }

  const wishlist = view.wishlist;
  const gifts: PublicGift[] = view.gifts;
  const deadlinePassed =
    wishlist.booking_open === false ||
    wishlist.booking_deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const isOwner = !!(user && wishlist.owner_id && user.id === wishlist.owner_id);

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
    if (occupied.has(giftId)) {
      setMessage('Подарок уже забронирован');
      return;
    }
    if (!wishlist.owner_id) {
      setMessage('Не удалось определить владельца вишлиста — обновите backend');
      return;
    }
    setConfirmGiftId(giftId);
  };

  const confirmBook = async () => {
    if (!user || !confirmGiftId || !token || !wishlist.owner_id) return;
    const gift = gifts.find((g) => g.id === confirmGiftId);
    if (!gift) return;
    setPending(true);
    try {
      await bookingsApi.createBooking({
        gift_id: gift.id,
        gift_title: gift.title,
        wishlist_id: wishlist.id,
        wishlist_owner_id: wishlist.owner_id,
        booking_deadline: wishlist.booking_deadline,
      });
      setConfirmGiftId(null);
      setMessage('Подарок забронирован! Владелец получит уведомление.');
      await load();
    } catch (err) {
      setMessage(errorMessage(err, 'Не удалось забронировать'));
      setConfirmGiftId(null);
    } finally {
      setPending(false);
    }
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
            событие {formatDate(wishlist.event_date)} · бронь до {formatDate(wishlist.booking_deadline)}
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
            const booked = occupied.has(g.id) || g.is_occupied;
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
              <PrimaryButton onClick={() => void confirmBook()} className="flex-1" disabled={pending}>
                {pending ? '…' : 'Забронировать'}
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
