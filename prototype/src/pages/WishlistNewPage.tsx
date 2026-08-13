import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { store, uid } from '../lib/store';
import { Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function WishlistNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('2026-12-01');
  const [deadline, setDeadline] = useState('2026-11-25');
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      setError('Укажите название');
      return;
    }
    if (deadline > eventDate) {
      setError('Дедлайн бронирования не может быть позже даты события');
      return;
    }
    const activeCount = store.wishlists.filter((w) => w.owner_id === user.id && !w.deleted_at).length;
    if (activeCount >= 20) {
      setError('Лимит MVP: не более 20 вишлистов');
      return;
    }

    const id = uid('wl');
    const now = new Date().toISOString();
    store.wishlists.push({
      id,
      owner_id: user.id,
      title: title.trim(),
      description: description.trim() || undefined,
      event_date: eventDate,
      booking_deadline: deadline,
      created_at: now,
      updated_at: now,
    });
    store.shareLinks.push({
      id: uid('sl'),
      wishlist_id: id,
      token: `share-${id.slice(-6)}`,
      is_active: true,
      created_at: now,
    });
    navigate(`/wishlists/${id}`);
  };

  return (
    <div>
      <PageHeader title="Новый вишлист" subtitle="Название, дата события и дедлайн бронирования" />
      <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Название *">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="День рождения…" />
        </Field>
        <Field label="Описание">
          <textarea
            className={`${inputClass} min-h-24`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Дата события *">
            <input className={inputClass} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Дедлайн брони *">
            <input className={inputClass} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <PrimaryButton type="submit">Сохранить</PrimaryButton>
          <Link to="/wishlists">
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
