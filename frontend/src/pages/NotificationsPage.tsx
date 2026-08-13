import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Notification } from '../api/types';
import * as notificationsApi from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/format';
import { Badge, EmptyState, PageHeader, SecondaryButton } from '../components/ui';

export function NotificationsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.listNotifications();
      setList([...res.items].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (err) {
      setList([]);
      setError(errorMessage(err, 'Не удалось загрузить уведомления'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  if (!user) return null;

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
      );
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отметить прочитанным'));
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      const now = new Date().toISOString();
      setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отметить все'));
    }
  };

  const label = (type: string) =>
    type === 'booking_created' ? 'Новая бронь' : 'Бронь отменена';

  return (
    <div>
      <PageHeader
        title="Уведомления"
        subtitle="Данные с API · booking_created / booking_cancelled"
        actions={
          list.some((n) => !n.read_at) ? (
            <SecondaryButton onClick={() => void markAll()}>Прочитать все</SecondaryButton>
          ) : undefined
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : list.length === 0 ? (
        <EmptyState title="Уведомлений нет" />
      ) : (
        <ul className="space-y-2">
          {list.map((n) => {
            const giftTitle = n.payload.gift_title ?? 'Подарок';
            const wlTitle = n.payload.wishlist_title ?? 'Вишлист';
            const bookerName = n.payload.booker_display_name ?? 'Пользователь';
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
                      <Badge tone={n.type === 'booking_created' ? 'success' : 'warning'}>
                        {label(n.type)}
                      </Badge>
                      {!n.read_at && <Badge tone="info">Новое</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-800">
                      {giftTitle} · {wlTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {bookerName} · {formatDateTime(n.created_at)}
                      {n.channel_flags.email ? ' · email' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => void markRead(n.id)}
                        className="text-slate-500 hover:underline"
                      >
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
