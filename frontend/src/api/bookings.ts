import { apiFetch } from './client';
import type {
  Booking,
  BookingListResponse,
  BookingStatus,
  CreateBookingRequest,
  PublicBookingStatusResponse,
} from './types';

export function createBooking(body: CreateBookingRequest): Promise<Booking> {
  return apiFetch<Booking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listBookingsByWishlist(
  wishlistId: string,
  status?: BookingStatus,
): Promise<BookingListResponse> {
  const params = new URLSearchParams({ wishlist_id: wishlistId });
  if (status) params.set('status', status);
  return apiFetch<BookingListResponse>(`/bookings?${params}`);
}

export function listMyBookings(status?: BookingStatus): Promise<BookingListResponse> {
  const q = status ? `?status=${status}` : '';
  return apiFetch<BookingListResponse>(`/bookings/me${q}`);
}

/** Public occupancy by gift ids (auth optional). */
export function getPublicBookingStatus(giftIds: string[]): Promise<PublicBookingStatusResponse> {
  const params = new URLSearchParams();
  giftIds.forEach((id) => params.append('gift_ids', id));
  return apiFetch<PublicBookingStatusResponse>(`/bookings/status?${params}`, { auth: false });
}

export function cancelBooking(bookingId: string): Promise<Booking> {
  return apiFetch<Booking>(`/bookings/${bookingId}/cancel`, { method: 'POST' });
}

export function adminListBookings(params?: {
  status?: BookingStatus;
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<BookingListResponse> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.q) q.set('q', params.q);
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.page_size != null) q.set('page_size', String(params.page_size));
  const qs = q.toString();
  return apiFetch<BookingListResponse>(`/admin/bookings${qs ? `?${qs}` : ''}`);
}

export function adminCancelBooking(bookingId: string): Promise<Booking> {
  return apiFetch<Booking>(`/admin/bookings/${bookingId}/cancel`, { method: 'POST' });
}
