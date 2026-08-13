import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Wishlist } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function WishlistEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const detail = await wishlistsApi.getWishlist(id);
        if (cancelled) return;
        setWishlist(detail);
        setTitle(detail.title);
        setDescription(detail.description ?? '');
        setEventDate(detail.event_date.slice(0, 10));
        setDeadline(detail.booking_deadline.slice(0, 10));
      } catch (err) {
        if (!cancelled) setLoadError(errorMessage(err, 'Вишлист не найден'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  if (loadError || !wishlist) return <EmptyState title={loadError || 'Вишлист не найден'} />;
  if (!user || wishlist.owner_id !== user.id) return <Navigate to="/wishlists" replace />;
  if (wishlist.deleted_at) {
    return (
      <EmptyState
        title="Нельзя редактировать удалённый вишлист"
        hint="Сначала восстановите его из списка удалённых"
      />
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      await wishlistsApi.updateWishlist(wishlist.id, {
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        booking_deadline: deadline,
      });
      navigate(`/wishlists/${wishlist.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сохранить'));
    } finally {
      setPending(false);
    }
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
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? 'Сохранение…' : 'Сохранить'}
          </PrimaryButton>
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
