import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { store, uid } from '../lib/store';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function GiftNewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const wishlist = store.wishlists.find((w) => w.id === id);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('https://');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  if (!wishlist) return <EmptyState title="Вишлист не найден" />;
  if (!user || wishlist.owner_id !== user.id) return <Navigate to="/wishlists" replace />;
  if (wishlist.deleted_at) {
    return <EmptyState title="Восстановите вишлист, чтобы добавлять подарки" />;
  }

  const cats = store.categories.filter((c) => c.wishlist_id === wishlist.id);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !price) {
      setError('Заполните название, ссылку и цену');
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Цена должна быть числом в RUB');
      return;
    }
    const count = store.gifts.filter((g) => g.wishlist_id === wishlist.id && !g.deleted_at).length;
    if (count >= 200) {
      setError('Лимит MVP: не более 200 подарков');
      return;
    }
    const now = new Date().toISOString();
    const giftId = uid('g');
    store.gifts.push({
      id: giftId,
      wishlist_id: wishlist.id,
      category_id: categoryId || null,
      title: title.trim(),
      url: url.trim(),
      price: priceNum,
      image_url: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: now,
      updated_at: now,
    });
    navigate(`/wishlists/${wishlist.id}`);
  };

  return (
    <div>
      <PageHeader title="Новый подарок" subtitle={wishlist.title} />
      <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Название *">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Ссылка *">
          <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
        <Field label="Цена, ₽ *">
          <input className={inputClass} type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Категория">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Без категории</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL изображения" hint="Или загрузка файла ≤5 МБ (jpeg/png/webp) — в прототипе только URL">
          <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Заметка">
          <textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <PrimaryButton type="submit">Добавить</PrimaryButton>
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
