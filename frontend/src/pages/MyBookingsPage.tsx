import { useEffect, useState } from 'react';
import * as bookingsApi from '../api/bookings';
import { errorMessage } from '../api/client';
import type { Booking } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import { Badge, EmptyState, PageHeader } from '../components/ui';

export function MyBookingsPage() {
  const { user } = useAuth();
  const [showCancelled, setShowCancelled] = useState(false);
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (cancelled: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsApi.listMyBookings(cancelled ? 'cancelled' : 'active');
      setList(res.items);
    } catch (err) {
      setList([]);
      setError(errorMessage(err, 'Не удалось загрузить бронирования'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(showCancelled);
  }, [showCancelled, user?.id]);

  if (!user) return null;

  const cancelBooking = async (bookingId: string) => {
    const b = list.find((x) => x.id === bookingId);
    if (!b || b.status !== 'active') return;
    if (b.booking_deadline.slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      setError('Дедлайн бронирования истёк — отмена недоступна');
      return;
    }
    try {
      await bookingsApi.cancelBooking(bookingId);
      await load(showCancelled);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отменить бронь'));
    }
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

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : list.length === 0 ? (
        <EmptyState title={showCancelled ? 'Нет отменённых броней' : 'Нет активных броней'} />
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{b.gift_title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Дедлайн брони: {formatDate(b.booking_deadline)}
                  </p>
                  <div className="mt-2">
                    <Badge tone={b.status === 'active' ? 'success' : 'neutral'}>
                      {b.status === 'active' ? 'Активна' : 'Отменена'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  {b.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => void cancelBooking(b.id)}
                      className="text-rose-600 hover:underline"
                    >
                      Отменить бронь
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
