import { useEffect, useState } from 'react';
import * as bookingsApi from '../api/bookings';
import { errorMessage } from '../api/client';
import type { Booking } from '../api/types';
import { formatDateTime } from '../lib/format';
import { Badge, EmptyState, PageHeader, inputClass } from '../components/ui';

export function AdminPage() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async (search: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsApi.adminListBookings({
        status: 'active',
        q: search || undefined,
        page_size: 100,
      });
      setBookings(res.items);
    } catch (err) {
      setBookings([]);
      setError(errorMessage(err, 'Не удалось загрузить бронирования'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(debouncedQ);
  }, [debouncedQ]);

  const cancelBooking = async (id: string) => {
    try {
      await bookingsApi.adminCancelBooking(id);
      await load(debouncedQ);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось отменить бронь'));
    }
  };

  return (
    <div>
      <PageHeader
        title="Админ-панель"
        subtitle="Модерация броней (GET/POST /api/admin/bookings)"
      />

      {error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <input
        className={`${inputClass} mb-4 max-w-md`}
        placeholder="Поиск по booker / подарку…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : bookings.length === 0 ? (
        <EmptyState title="Активных броней нет" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Booker</th>
                <th className="px-4 py-3">Подарок</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.booker_display_name}</div>
                    <div className="text-xs text-slate-400">{b.booker_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.gift_title}</div>
                    <div className="text-xs text-slate-400">
                      <Badge tone="success">active</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void cancelBooking(b.id)}
                      className="text-rose-600 hover:underline"
                    >
                      Отменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
