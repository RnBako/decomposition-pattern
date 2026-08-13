import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Category, Gift, Wishlist } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function GiftEditPage() {
  const { id, giftId } = useParams<{ id: string; giftId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [gift, setGift] = useState<Gift | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const reload = async () => {
    if (!id || !giftId) return;
    setLoading(true);
    setLoadError('');
    try {
      const detail = await wishlistsApi.getWishlist(id, { includeDeletedGifts: true });
      const found = (detail.gifts ?? []).find((g) => g.id === giftId) ?? null;
      setWishlist(detail);
      setCats(detail.categories ?? []);
      setGift(found);
      if (found) {
        setTitle(found.title);
        setUrl(found.url);
        setPrice(String(found.price));
        setCategoryId(found.category_id ?? '');
        setNotes(found.notes ?? '');
        setImageUrl(found.image_url ?? '');
      }
    } catch (err) {
      setLoadError(errorMessage(err, 'Подарок не найден'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [id, giftId]);

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;
  if (loadError || !wishlist || !gift) return <EmptyState title={loadError || 'Подарок не найден'} />;
  if (!user || wishlist.owner_id !== user.id) return <Navigate to="/wishlists" replace />;

  const onSubmit = async (e: FormEvent) => {
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
    setPending(true);
    setError('');
    try {
      await wishlistsApi.updateGift(wishlist.id, gift.id, {
        title: title.trim(),
        url: url.trim(),
        price: priceNum,
        category_id: categoryId || null,
        notes: notes.trim() || null,
        image_url: imageUrl.trim() || null,
      });
      navigate(`/wishlists/${wishlist.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сохранить'));
    } finally {
      setPending(false);
    }
  };

  const softDelete = async () => {
    try {
      await wishlistsApi.deleteGift(wishlist.id, gift.id);
      navigate(`/wishlists/${wishlist.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось удалить'));
    }
  };

  const restore = async () => {
    try {
      await wishlistsApi.restoreGift(wishlist.id, gift.id);
      await reload();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось восстановить'));
    }
  };

  return (
    <div>
      <PageHeader title="Редактирование подарка" subtitle={wishlist.title} />
      {gift.deleted_at && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>Подарок удалён</span>
          <button type="button" onClick={() => void restore()} className="font-medium underline">
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
            value={categoryId}
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
          {!gift.deleted_at && (
            <PrimaryButton type="submit" disabled={pending}>
              {pending ? 'Сохранение…' : 'Сохранить'}
            </PrimaryButton>
          )}
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Назад</SecondaryButton>
          </Link>
          {!gift.deleted_at && (
            <button type="button" onClick={() => void softDelete()} className="text-sm text-rose-600 hover:underline">
              Soft delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
