import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRub } from '../data/mock';
import { store, uid } from '../lib/store';
import { Badge, EmptyState, PageHeader } from '../components/ui';

export function MyBookingsPage() {
  const { user } = useAuth();
  const [showCancelled, setShowCancelled] = useState(false);
  const [, bump] = useState(0);

  if (!user) return null;

  const list = store.bookings.filter((b) => {
    if (b.booker_id !== user.id) return false;
    return showCancelled ? b.status === 'cancelled' : b.status === 'active';
  });

  const cancelBooking = (bookingId: string) => {
    const b = store.bookings.find((x) => x.id === bookingId);
    if (!b || b.status !== 'active') return;
    const gift = store.gifts.find((g) => g.id === b.gift_id);
    const wl = gift ? store.wishlists.find((w) => w.id === gift.wishlist_id) : undefined;
    if (wl && wl.booking_deadline < new Date().toISOString().slice(0, 10)) {
      alert('Дедлайн бронирования истёк — отмена недоступна');
      return;
    }
    b.status = 'cancelled';
    b.cancelled_at = new Date().toISOString();
    b.cancelled_by_id = user.id;
    b.updated_at = b.cancelled_at;
    if (wl) {
      store.notifications.unshift({
        id: uid('n'),
        recipient_id: wl.owner_id,
        type: 'booking_cancelled',
        payload: { wishlist_id: wl.id, gift_id: b.gift_id, booker_id: user.id },
        channel_flags: { in_app: true, email: true },
        read_at: null,
        created_at: new Date().toISOString(),
      });
    }
    bump((n) => n + 1);
  };

  return (
    <div>
      <PageHeader title="Мои бронирования" subtitle="Подарки, которые вы забронировали" />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowCancelled(false)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !showCancelled ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          Активные
        </button>
        <button
          type="button"
          onClick={() => setShowCancelled(true)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            showCancelled ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          Отменённые
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={showCancelled ? 'Нет отменённых броней' : 'Нет активных броней'} />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => {
            const gift = store.gifts.find((g) => g.id === b.gift_id);
            const wl = gift ? store.wishlists.find((w) => w.id === gift.wishlist_id) : undefined;
            const share = wl
              ? store.shareLinks.find((s) => s.wishlist_id === wl.id && s.is_active)
              : undefined;
            return (
              <li key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{gift?.title ?? 'Подарок'}</p>
                    <p className="text-sm text-slate-500">
                      {wl?.title} · {gift ? formatRub(gift.price) : ''}
                    </p>
                    {wl && (
                      <p className="mt-1 text-xs text-slate-400">
                        Дедлайн брони: {formatDate(wl.booking_deadline)}
                      </p>
                    )}
                    <div className="mt-2">
                      <Badge tone={b.status === 'active' ? 'success' : 'neutral'}>
                        {b.status === 'active' ? 'Активна' : 'Отменена'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    {share && (
                      <Link to={`/w/${share.token}`} className="text-teal-700 hover:underline">
                        Публичная страница
                      </Link>
                    )}
                    {b.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => cancelBooking(b.id)}
                        className="text-rose-600 hover:underline"
                      >
                        Отменить бронь
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
