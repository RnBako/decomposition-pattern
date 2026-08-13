/**
 * In-memory mutable store for prototype interactions (booking, soft-delete, etc.)
 * Seeded from mock.ts; changes reset on full page reload unless persisted lightly.
 */
import {
  bookings as seedBookings,
  categories as seedCategories,
  comments as seedComments,
  gifts as seedGifts,
  notifications as seedNotifications,
  shareLinks as seedShareLinks,
  wishlists as seedWishlists,
  type Booking,
  type Category,
  type Comment,
  type Gift,
  type Notification,
  type ShareLink,
  type Wishlist,
} from '../data/mock';

function clone<T>(data: T): T {
  return structuredClone(data);
}

export const store = {
  wishlists: clone(seedWishlists) as Wishlist[],
  gifts: clone(seedGifts) as Gift[],
  bookings: clone(seedBookings) as Booking[],
  comments: clone(seedComments) as Comment[],
  notifications: clone(seedNotifications) as Notification[],
  shareLinks: clone(seedShareLinks) as ShareLink[],
  categories: clone(seedCategories) as Category[],
};

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
