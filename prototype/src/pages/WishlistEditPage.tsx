import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { store } from '../lib/store';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function WishlistEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const wishlist = store.wishlists.find((w) => w.id === id);

  const [title, setTitle] = useState(wishlist?.title ?? '');
  const [description, setDescription] = useState(wishlist?.description ?? '');
  const [eventDate, setEventDate] = useState(wishlist?.event_date ?? '');
  const [deadline, setDeadline] = useState(wishlist?.booking_deadline ?? '');
  const [error, setError] = useState('');

  if (!wishlist) return <EmptyState title="Вишлист не найден" />;
  if (!user || wishlist.owner_id !== user.id) return <Navigate to="/wishlists" replace />;
  if (wishlist.deleted_at) {
    return (
      <EmptyState
        title="Нельзя редактировать удалённый вишлист"
        hint="Сначала восстановите его из списка удалённых"
      />
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название');
      return;
    }
    if (deadline > eventDate) {
      setError('Дедлайн бронирования не может быть позже даты события');
      return;
    }
    wishlist.title = title.trim();
    wishlist.description = description.trim() || undefined;
    wishlist.event_date = eventDate;
    wishlist.booking_deadline = deadline;
    wishlist.updated_at = new Date().toISOString();
    navigate(`/wishlists/${wishlist.id}`);
  };

  return (
    <div>
      <PageHeader title="Редактирование вишлиста" />
      <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Название *">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Описание">
          <textarea
            className={`${inputClass} min-h-24`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
