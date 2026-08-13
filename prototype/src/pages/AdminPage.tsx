import { useMemo, useState } from 'react';
import { users, formatDateTime, formatRub, getUser } from '../data/mock';
import { store, uid } from '../lib/store';
import { Badge, EmptyState, PageHeader, inputClass } from '../components/ui';

export function AdminPage() {
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  const [tab, setTab] = useState<'bookings' | 'wishlists' | 'users'>('bookings');

  const bookings = useMemo(() => {
    return store.bookings
      .filter((b) => b.status === 'active')
      .filter((b) => {
        if (!q.trim()) return true;
        const booker = getUser(b.booker_id);
        const gift = store.gifts.find((g) => g.id === b.gift_id);
        const hay = `${booker?.display_name} ${booker?.email} ${gift?.title}`.toLowerCase();
        return hay.includes(q.trim().toLowerCase());
      });
  }, [q, bump]);

  const cancelBooking = (id: string) => {
    const b = store.bookings.find((x) => x.id === id);
    if (!b) return;
    const gift = store.gifts.find((g) => g.id === b.gift_id);
    const wl = gift ? store.wishlists.find((w) => w.id === gift.wishlist_id) : undefined;
    b.status = 'cancelled';
    b.cancelled_at = new Date().toISOString();
    b.cancelled_by_id = 'u-admin';
    b.updated_at = b.cancelled_at;
    if (wl) {
      store.notifications.unshift({
        id: uid('n'),
        recipient_id: wl.owner_id,
        type: 'booking_cancelled',
        payload: { wishlist_id: wl.id, gift_id: b.gift_id, booker_id: b.booker_id },
        channel_flags: { in_app: true, email: true },
        read_at: null,
        created_at: new Date().toISOString(),
      });
    }
    bump((n) => n + 1);
  };

  const toggleWishlistDelete = (id: string) => {
    const w = store.wishlists.find((x) => x.id === id);
    if (!w) return;
    w.deleted_at = w.deleted_at ? null : new Date().toISOString();
    bump((n) => n + 1);
  };

  const toggleGiftDelete = (id: string) => {
    const g = store.gifts.find((x) => x.id === id);
    if (!g) return;
    g.deleted_at = g.deleted_at ? null : new Date().toISOString();
    bump((n) => n + 1);
  };

  return (
    <div>
      <PageHeader
        title="Админ-панель"
        subtitle="Модерация броней, soft-delete, роли пользователей"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['bookings', 'Бронирования'],
            ['wishlists', 'Вишлисты / подарки'],
            ['users', 'Пользователи'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <>
          <input
            className={`${inputClass} mb-4 max-w-md`}
            placeholder="Поиск по booker / подарку…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {bookings.length === 0 ? (
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
                  {bookings.map((b) => {
                    const booker = getUser(b.booker_id);
                    const gift = store.gifts.find((g) => g.id === b.gift_id);
                    return (
                      <tr key={b.id} className="border-b border-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{booker?.display_name}</div>
                          <div className="text-xs text-slate-400">{booker?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{gift?.title}</div>
                          <div className="text-xs text-slate-400">{gift ? formatRub(gift.price) : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDateTime(b.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => cancelBooking(b.id)}
                            className="text-rose-600 hover:underline"
                          >
                            Отменить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'wishlists' && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Вишлисты</h2>
            <ul className="space-y-2">
              {store.wishlists.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{w.title}</span>
                    {w.deleted_at && (
                      <Badge tone="danger">
                        soft-deleted
                      </Badge>
                    )}
                    <p className="text-xs text-slate-400">owner: {getUser(w.owner_id)?.display_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleWishlistDelete(w.id)}
                    className="text-teal-700 hover:underline"
                  >
                    {w.deleted_at ? 'Restore' : 'Soft delete'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Подарки (выборка)</h2>
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {store.gifts.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-4 py-2 text-sm"
                >
                  <span>
                    {g.title} {g.deleted_at && <Badge tone="danger">deleted</Badge>}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGiftDelete(g.id)}
                    className="text-xs text-teal-700 hover:underline"
                  >
                    {g.deleted_at ? 'Restore' : 'Soft delete'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'users' && (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{u.display_name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <Badge tone={u.role === 'admin' ? 'warning' : 'neutral'}>{u.role}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
