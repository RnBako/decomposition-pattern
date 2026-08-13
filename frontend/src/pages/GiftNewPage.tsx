import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Category, Wishlist } from '../api/types';
import * as wishlistsApi from '../api/wishlists';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Field, PageHeader, PrimaryButton, SecondaryButton, inputClass } from '../components/ui';

export function GiftNewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('https://');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const detail = await wishlistsApi.getWishlist(id);
        if (cancelled) return;
        setWishlist(detail);
        setCats(detail.categories ?? []);
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
    return <EmptyState title="Восстановите вишлист, чтобы добавлять подарки" />;
  }

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
      const gift = await wishlistsApi.createGift(wishlist.id, {
        title: title.trim(),
        url: url.trim(),
        price: priceNum,
        currency: 'RUB',
        category_id: categoryId || null,
        image_url: imageUrl.trim() || null,
        notes: notes.trim() || null,
      });
      if (imageFile) {
        try {
          await wishlistsApi.uploadGiftImage(wishlist.id, gift.id, imageFile);
        } catch (uploadErr) {
          setError(errorMessage(uploadErr, 'Подарок создан, но загрузка фото не удалась'));
          navigate(`/wishlists/${wishlist.id}`);
          return;
        }
      }
      navigate(`/wishlists/${wishlist.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось добавить подарок'));
    } finally {
      setPending(false);
    }
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
        <Field label="URL изображения">
          <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Файл изображения" hint="jpeg/png/webp ≤5 МБ">
          <input
            className={inputClass}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Заметка">
          <textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={pending}>
            {pending ? 'Добавление…' : 'Добавить'}
          </PrimaryButton>
          <Link to={`/wishlists/${wishlist.id}`}>
            <SecondaryButton type="button">Отмена</SecondaryButton>
          </Link>
        </div>
      </form>
    </div>
  );
}
