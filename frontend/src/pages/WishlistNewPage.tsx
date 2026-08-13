import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function WishlistNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('2026-12-01');
  const [deadline, setDeadline] = useState('2026-11-25');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
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
    setPending(true);
    setError('');
    try {
      const created = await wishlistsApi.createWishlist({
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        booking_deadline: deadline,
      });
      try {
        await wishlistsApi.createShareLink(created.id);
      } catch {
        /* share link optional on create */
      }
      navigate(`/wishlists/${created.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось создать вишлист'));
    } finally {
      setPending(false);
    }
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
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? 'Сохранение…' : 'Сохранить'}
          </PrimaryButton>
          <Link to="/wishlists">
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
