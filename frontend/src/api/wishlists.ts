import { apiFetch } from './client';
import type {
  Category,
  CategoryCreate,
  Comment,
  CommentCreate,
  Gift,
  GiftCreate,
  GiftUpdate,
  PublicShareView,
  ShareLink,
  Wishlist,
  WishlistCreate,
  WishlistDetail,
  WishlistListResponse,
  WishlistUpdate,
} from './types';

export function listWishlists(includeDeleted = false): Promise<WishlistListResponse> {
  const q = includeDeleted ? '?include_deleted=true' : '';
  return apiFetch<WishlistListResponse>(`/wishlists${q}`);
}

export function createWishlist(body: WishlistCreate): Promise<Wishlist> {
  return apiFetch<Wishlist>('/wishlists', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getWishlist(
  wishlistId: string,
  opts?: { includeDeletedGifts?: boolean },
): Promise<WishlistDetail> {
  const q = opts?.includeDeletedGifts ? '?include_deleted_gifts=true' : '';
  return apiFetch<WishlistDetail>(`/wishlists/${wishlistId}${q}`);
}

export function asList<T>(res: { items: T[] } | T[]): T[] {
  return Array.isArray(res) ? res : res.items ?? [];
}

export function updateWishlist(wishlistId: string, body: WishlistUpdate): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/wishlists/${wishlistId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteWishlist(wishlistId: string): Promise<void> {
  return apiFetch<void>(`/wishlists/${wishlistId}`, { method: 'DELETE' });
}

export function restoreWishlist(wishlistId: string): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/wishlists/${wishlistId}/restore`, { method: 'POST' });
}

export function listCategories(wishlistId: string): Promise<{ items: Category[] } | Category[]> {
  return apiFetch(`/wishlists/${wishlistId}/categories`);
}

export function createCategory(wishlistId: string, body: CategoryCreate): Promise<Category> {
  return apiFetch<Category>(`/wishlists/${wishlistId}/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createGift(wishlistId: string, body: GiftCreate): Promise<Gift> {
  return apiFetch<Gift>(`/wishlists/${wishlistId}/gifts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateGift(wishlistId: string, giftId: string, body: GiftUpdate): Promise<Gift> {
  return apiFetch<Gift>(`/wishlists/${wishlistId}/gifts/${giftId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteGift(wishlistId: string, giftId: string): Promise<void> {
  return apiFetch<void>(`/wishlists/${wishlistId}/gifts/${giftId}`, { method: 'DELETE' });
}

export function restoreGift(wishlistId: string, giftId: string): Promise<Gift> {
  return apiFetch<Gift>(`/wishlists/${wishlistId}/gifts/${giftId}/restore`, { method: 'POST' });
}

export function uploadGiftImage(wishlistId: string, giftId: string, file: File): Promise<Gift> {
  const form = new FormData();
  form.append('image', file);
  return apiFetch<Gift>(`/wishlists/${wishlistId}/gifts/${giftId}/image`, {
    method: 'POST',
    body: form,
    rawBody: true,
  });
}

export function getShareLink(wishlistId: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(`/wishlists/${wishlistId}/share-link`);
}

export function createShareLink(wishlistId: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(`/wishlists/${wishlistId}/share-link`, { method: 'POST' });
}

export function revokeShareLink(wishlistId: string): Promise<ShareLink> {
  return apiFetch<ShareLink>(`/wishlists/${wishlistId}/share-link`, { method: 'DELETE' });
}

export function listWishlistComments(wishlistId: string): Promise<{ items: Comment[] } | Comment[]> {
  return apiFetch(`/wishlists/${wishlistId}/comments`);
}

export function createWishlistComment(wishlistId: string, body: CommentCreate): Promise<Comment> {
  return apiFetch<Comment>(`/wishlists/${wishlistId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createGiftComment(
  wishlistId: string,
  giftId: string,
  body: CommentCreate,
): Promise<Comment> {
  return apiFetch<Comment>(`/wishlists/${wishlistId}/gifts/${giftId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Public share view (no JWT). */
export function getPublicShare(token: string): Promise<PublicShareView> {
  return apiFetch<PublicShareView>(`/share/${encodeURIComponent(token)}`, { auth: false });
}

/** Public media URL helper (relative). */
export function mediaUrl(storageKey: string): string {
  return `/api/media/${encodeURIComponent(storageKey)}`;
}
