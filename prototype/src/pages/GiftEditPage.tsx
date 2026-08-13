import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { store } from '../lib/store';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function GiftEditPage() {
  const { id, giftId } = useParams<{ id: string; giftId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const wishlist = store.wishlists.find((w) => w.id === id);
  const gift = store.gifts.find((g) => g.id === giftId && g.wishlist_id === id);

  const [title, setTitle] = useState(gift?.title ?? '');
  const [url, setUrl] = useState(gift?.url ?? '');
  const [price, setPrice] = useState(String(gift?.price ?? ''));
  const [categoryId, setCategoryId] = useState(gift?.category_id ?? '');
  const [notes, setNotes] = useState(gift?.notes ?? '');
  const [imageUrl, setImageUrl] = useState(gift?.image_url ?? '');
  const [error, setError] = useState('');
  const [, bump] = useState(0);

  if (!wishlist || !gift) return <EmptyState title="Подарок не найден" />;
  if (!user || wishlist.owner_id !== user.id) return <Navigate to="/wishlists" replace />;

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
    gift.title = title.trim();
    gift.url = url.trim();
    gift.price = priceNum;
    gift.category_id = categoryId || null;
    gift.notes = notes.trim() || undefined;
    gift.image_url = imageUrl.trim() || undefined;
    gift.updated_at = new Date().toISOString();
    navigate(`/wishlists/${wishlist.id}`);
  };

  const softDelete = () => {
    gift.deleted_at = new Date().toISOString();
    navigate(`/wishlists/${wishlist.id}`);
  };

  const restore = () => {
    gift.deleted_at = null;
    bump((n) => n + 1);
  };

  return (
    <div>
      <PageHeader title="Редактирование подарка" subtitle={wishlist.title} />
      {gift.deleted_at && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>Подарок удалён</span>
          <button type="button" onClick={restore} className="font-medium underline">
            Восстановить
          </button>
        </div>
      )}
      <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Название *">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!!gift.deleted_at} />
        </Field>
        <Field label="Ссылка *">
          <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} disabled={!!gift.deleted_at} />
        </Field>
        <Field label="Цена, ₽ *">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={!!gift.deleted_at}
          />
        </Field>
        <Field label="Категория">
          <select
            className={inputClass}
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!!gift.deleted_at}
          >
            <option value="">Без категории</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="URL изображения">
          <input
            className={inputClass}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={!!gift.deleted_at}
          />
        </Field>
        <Field label="Заметка">
          <textarea
            className={`${inputClass} min-h-20`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!!gift.deleted_at}
          />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {!gift.deleted_at && <PrimaryButton type="submit">Сохранить</PrimaryButton>}
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Назад</SecondaryButton>
          </Link>
          {!gift.deleted_at && (
            <button type="button" onClick={softDelete} className="text-sm text-rose-600 hover:underline">
              Soft delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
