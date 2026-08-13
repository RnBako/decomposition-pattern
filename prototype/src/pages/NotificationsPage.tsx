import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, getUser } from '../data/mock';
import { store } from '../lib/store';
import { Badge, EmptyState, PageHeader, SecondaryButton } from '../components/ui';

export function NotificationsPage() {
  const { user } = useAuth();
  const [, bump] = useState(0);

  if (!user) return null;

  const list = store.notifications
    .filter((n) => n.recipient_id === user.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const markRead = (id: string) => {
    const n = store.notifications.find((x) => x.id === id);
    if (n && !n.read_at) {
      n.read_at = new Date().toISOString();
      bump((x) => x + 1);
    }
  };

  const markAll = () => {
    list.forEach((n) => {
      if (!n.read_at) n.read_at = new Date().toISOString();
    });
    bump((x) => x + 1);
  };

  const label = (type: string) =>
    type === 'booking_created' ? 'Новая бронь' : 'Бронь отменена';

  return (
    <div>
      <PageHeader
        title="Уведомления"
        subtitle="In-app: booking_created / booking_cancelled"
        actions={
          list.some((n) => !n.read_at) ? (
            <SecondaryButton onClick={markAll}>Прочитать все</SecondaryButton>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState title="Уведомлений нет" />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const gift = store.gifts.find((g) => g.id === n.payload.gift_id);
            const booker = getUser(n.payload.booker_id);
            const wl = store.wishlists.find((w) => w.id === n.payload.wishlist_id);
            return (
              <li
                key={n.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  n.read_at ? 'border-slate-100 bg-white' : 'border-teal-200 bg-teal-50/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={n.type === 'booking_created' ? 'success' : 'warning'}>{label(n.type)}</Badge>
                      {!n.read_at && <Badge tone="info">Новое</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-800">
                      {gift?.title ?? 'Подарок'} · {wl?.title ?? 'Вишлист'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {booker?.display_name ?? 'Пользователь'} · {formatDateTime(n.created_at)}
                      {n.channel_flags.email ? ' · email отправлен' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    {!n.read_at && (
                      <button type="button" onClick={() => markRead(n.id)} className="text-slate-500 hover:underline">
                        Прочитано
                      </button>
                    )}
                    <Link
                      to={`/wishlists/${n.payload.wishlist_id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Открыть
                    </Link>
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
