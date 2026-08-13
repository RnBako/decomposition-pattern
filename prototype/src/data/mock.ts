export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface Wishlist {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  event_date: string;
  booking_deadline: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Category {
  id: string;
  wishlist_id: string;
  name: string;
  sort_order: number;
}

export interface Gift {
  id: string;
  wishlist_id: string;
  category_id?: string | null;
  title: string;
  url: string;
  price: number;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type BookingStatus = 'active' | 'cancelled';

export interface Booking {
  id: string;
  gift_id: string;
  booker_id: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancelled_by_id?: string | null;
}

export interface Comment {
  id: string;
  author_id: string;
  wishlist_id?: string | null;
  gift_id?: string | null;
  body: string;
  created_at: string;
  deleted_at?: string | null;
}

export type NotificationType = 'booking_created' | 'booking_cancelled';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  payload: {
    wishlist_id: string;
    gift_id: string;
    booker_id: string;
  };
  channel_flags: { in_app: boolean; email: boolean };
  read_at?: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  wishlist_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
}

/** Demo credentials shown on login page */
export const DEMO_CREDENTIALS = [
  { email: 'anna@wishly.ru', password: 'demo123', label: 'Владелец' },
  { email: 'ivan@wishly.ru', password: 'demo123', label: 'Гость (booker)' },
  { email: 'admin@wishly.ru', password: 'demo123', label: 'Админ' },
] as const;

export const users: User[] = [
  {
    id: 'u-owner',
    email: 'anna@wishly.ru',
    password: 'demo123',
    display_name: 'Анна Смирнова',
    role: 'user',
    created_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'u-booker',
    email: 'ivan@wishly.ru',
    password: 'demo123',
    display_name: 'Иван Петров',
    role: 'user',
    created_at: '2026-02-01T12:00:00Z',
  },
  {
    id: 'u-booker2',
    email: 'maria@wishly.ru',
    password: 'demo123',
    display_name: 'Мария Козлова',
    role: 'user',
    created_at: '2026-02-15T09:00:00Z',
  },
  {
    id: 'u-admin',
    email: 'admin@wishly.ru',
    password: 'demo123',
    display_name: 'Админ Wishly',
    role: 'admin',
    created_at: '2026-01-01T08:00:00Z',
  },
];

export const wishlists: Wishlist[] = [
  {
    id: 'wl-1',
    owner_id: 'u-owner',
    title: 'День рождения Анны',
    description: 'Список желаний к 15 сентября. Спасибо, что заглянули!',
    event_date: '2026-09-15',
    booking_deadline: '2026-09-10',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-01T14:00:00Z',
  },
  {
    id: 'wl-2',
    owner_id: 'u-owner',
    title: 'Новый год 2027',
    description: 'Уютные подарки под ёлку',
    event_date: '2026-12-31',
    booking_deadline: '2026-12-25',
    created_at: '2026-07-20T11:00:00Z',
    updated_at: '2026-07-20T11:00:00Z',
  },
  {
    id: 'wl-3',
    owner_id: 'u-owner',
    title: 'Дом и кухня',
    description: 'Для обустройства квартиры',
    event_date: '2026-11-01',
    booking_deadline: '2026-10-20',
    created_at: '2026-05-01T09:00:00Z',
    updated_at: '2026-05-15T09:00:00Z',
    deleted_at: '2026-08-05T12:00:00Z',
  },
  {
    id: 'wl-4',
    owner_id: 'u-booker',
    title: 'День рождения Ивана',
    description: 'Мой список на октябрь',
    event_date: '2026-10-12',
    booking_deadline: '2026-10-05',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-10T10:00:00Z',
  },
];

export const categories: Category[] = [
  { id: 'cat-1', wishlist_id: 'wl-1', name: 'Электроника', sort_order: 1 },
  { id: 'cat-2', wishlist_id: 'wl-1', name: 'Книги', sort_order: 2 },
  { id: 'cat-3', wishlist_id: 'wl-1', name: 'Уход за собой', sort_order: 3 },
  { id: 'cat-4', wishlist_id: 'wl-2', name: 'Декор', sort_order: 1 },
  { id: 'cat-5', wishlist_id: 'wl-2', name: 'Еда и напитки', sort_order: 2 },
  { id: 'cat-6', wishlist_id: 'wl-4', name: 'Спорт', sort_order: 1 },
];

export const gifts: Gift[] = [
  {
    id: 'g-1',
    wishlist_id: 'wl-1',
    category_id: 'cat-1',
    title: 'Беспроводные наушники Sony WH-1000XM5',
    url: 'https://www.sony.ru/headphones',
    price: 34990,
    image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop',
    notes: 'Чёрный цвет предпочтительнее',
    created_at: '2026-06-02T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'g-2',
    wishlist_id: 'wl-1',
    category_id: 'cat-1',
    title: 'Электронная книга Kindle Paperwhite',
    url: 'https://www.amazon.com/kindle',
    price: 18990,
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop',
    created_at: '2026-06-03T10:00:00Z',
    updated_at: '2026-06-03T10:00:00Z',
  },
  {
    id: 'g-3',
    wishlist_id: 'wl-1',
    category_id: 'cat-2',
    title: 'Книга «Атлант расправил плечи»',
    url: 'https://www.litres.ru/book/atlas',
    price: 1290,
    image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
    notes: 'Твёрдый переплёт',
    created_at: '2026-06-04T10:00:00Z',
    updated_at: '2026-06-04T10:00:00Z',
  },
  {
    id: 'g-4',
    wishlist_id: 'wl-1',
    category_id: 'cat-3',
    title: 'Набор уходовой косметики The Ordinary',
    url: 'https://theordinary.com',
    price: 4500,
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
    created_at: '2026-06-05T10:00:00Z',
    updated_at: '2026-06-05T10:00:00Z',
  },
  {
    id: 'g-5',
    wishlist_id: 'wl-1',
    category_id: null,
    title: 'Сертификат в ресторан White Rabbit',
    url: 'https://whiterabbitmoscow.ru',
    price: 10000,
    notes: 'Люминал 10 000 ₽',
    created_at: '2026-06-06T10:00:00Z',
    updated_at: '2026-06-06T10:00:00Z',
  },
  {
    id: 'g-6',
    wishlist_id: 'wl-1',
    category_id: 'cat-2',
    title: 'Ежедневник Leuchtturm1917',
    url: 'https://leuchtturm1917.com',
    price: 3200,
    image_url: 'https://images.unsplash.com/photo-1531346878377-a5be20836c33?w=400&h=400&fit=crop',
    created_at: '2026-06-07T10:00:00Z',
    updated_at: '2026-06-07T10:00:00Z',
    deleted_at: '2026-08-01T09:00:00Z',
  },
  {
    id: 'g-7',
    wishlist_id: 'wl-2',
    category_id: 'cat-4',
    title: 'Гирлянда тёплый свет 10 м',
    url: 'https://ozon.ru/garland',
    price: 1890,
    image_url: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=400&fit=crop',
    created_at: '2026-07-21T10:00:00Z',
    updated_at: '2026-07-21T10:00:00Z',
  },
  {
    id: 'g-8',
    wishlist_id: 'wl-2',
    category_id: 'cat-5',
    title: 'Набор чая Whittard',
    url: 'https://whittard.com',
    price: 5200,
    image_url: 'https://images.unsplash.com/photo-1564890369473-f1c4f3e8d8b5?w=400&h=400&fit=crop',
    created_at: '2026-07-22T10:00:00Z',
    updated_at: '2026-07-22T10:00:00Z',
  },
  {
    id: 'g-9',
    wishlist_id: 'wl-2',
    category_id: null,
    title: 'Плед из мериноса',
    url: 'https://wildberries.ru/plaid',
    price: 7900,
    image_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop',
    created_at: '2026-07-23T10:00:00Z',
    updated_at: '2026-07-23T10:00:00Z',
  },
  {
    id: 'g-10',
    wishlist_id: 'wl-4',
    category_id: 'cat-6',
    title: 'Кроссовки Nike Pegasus 41',
    url: 'https://nike.com/pegasus',
    price: 14990,
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    notes: 'Размер 43',
    created_at: '2026-07-02T10:00:00Z',
    updated_at: '2026-07-02T10:00:00Z',
  },
  {
    id: 'g-11',
    wishlist_id: 'wl-4',
    category_id: 'cat-6',
    title: 'Фитнес-браслет Xiaomi Band 9',
    url: 'https://mi.com/band',
    price: 4990,
    image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&h=400&fit=crop',
    created_at: '2026-07-03T10:00:00Z',
    updated_at: '2026-07-03T10:00:00Z',
  },
];

export const bookings: Booking[] = [
  {
    id: 'b-1',
    gift_id: 'g-1',
    booker_id: 'u-booker',
    status: 'active',
    created_at: '2026-08-01T15:00:00Z',
    updated_at: '2026-08-01T15:00:00Z',
  },
  {
    id: 'b-2',
    gift_id: 'g-3',
    booker_id: 'u-booker2',
    status: 'active',
    created_at: '2026-08-02T11:00:00Z',
    updated_at: '2026-08-02T11:00:00Z',
  },
  {
    id: 'b-3',
    gift_id: 'g-8',
    booker_id: 'u-booker',
    status: 'cancelled',
    created_at: '2026-07-25T10:00:00Z',
    updated_at: '2026-07-28T10:00:00Z',
    cancelled_at: '2026-07-28T10:00:00Z',
    cancelled_by_id: 'u-booker',
  },
  {
    id: 'b-4',
    gift_id: 'g-10',
    booker_id: 'u-owner',
    status: 'active',
    created_at: '2026-08-03T09:00:00Z',
    updated_at: '2026-08-03T09:00:00Z',
  },
];

export const comments: Comment[] = [
  {
    id: 'c-1',
    author_id: 'u-owner',
    wishlist_id: 'wl-1',
    gift_id: null,
    body: 'Не стесняйтесь бронировать — буду рада любому подарку!',
    created_at: '2026-06-10T12:00:00Z',
  },
  {
    id: 'c-2',
    author_id: 'u-owner',
    wishlist_id: 'wl-1',
    gift_id: 'g-1',
    body: 'Если наушников нет в наличии — можно взять аналог от Bose.',
    created_at: '2026-06-11T12:00:00Z',
  },
  {
    id: 'c-3',
    author_id: 'u-owner',
    wishlist_id: 'wl-1',
    gift_id: 'g-5',
    body: 'Сертификат можно электронный.',
    created_at: '2026-06-12T12:00:00Z',
  },
];

export const notifications: Notification[] = [
  {
    id: 'n-1',
    recipient_id: 'u-owner',
    type: 'booking_created',
    payload: { wishlist_id: 'wl-1', gift_id: 'g-1', booker_id: 'u-booker' },
    channel_flags: { in_app: true, email: true },
    read_at: null,
    created_at: '2026-08-01T15:01:00Z',
  },
  {
    id: 'n-2',
    recipient_id: 'u-owner',
    type: 'booking_created',
    payload: { wishlist_id: 'wl-1', gift_id: 'g-3', booker_id: 'u-booker2' },
    channel_flags: { in_app: true, email: true },
    read_at: '2026-08-02T18:00:00Z',
    created_at: '2026-08-02T11:01:00Z',
  },
  {
    id: 'n-3',
    recipient_id: 'u-owner',
    type: 'booking_cancelled',
    payload: { wishlist_id: 'wl-2', gift_id: 'g-8', booker_id: 'u-booker' },
    channel_flags: { in_app: true, email: true },
    read_at: null,
    created_at: '2026-07-28T10:01:00Z',
  },
  {
    id: 'n-4',
    recipient_id: 'u-booker',
    type: 'booking_created',
    payload: { wishlist_id: 'wl-4', gift_id: 'g-10', booker_id: 'u-owner' },
    channel_flags: { in_app: true, email: true },
    read_at: null,
    created_at: '2026-08-03T09:01:00Z',
  },
];

export const shareLinks: ShareLink[] = [
  {
    id: 'sl-1',
    wishlist_id: 'wl-1',
    token: 'anna-bday-2026',
    is_active: true,
    created_at: '2026-06-15T10:00:00Z',
  },
  {
    id: 'sl-2',
    wishlist_id: 'wl-2',
    token: 'anna-ny-2027',
    is_active: true,
    created_at: '2026-07-25T10:00:00Z',
  },
  {
    id: 'sl-3',
    wishlist_id: 'wl-1',
    token: 'anna-old-link',
    is_active: false,
    created_at: '2026-06-01T10:00:00Z',
    revoked_at: '2026-06-15T09:00:00Z',
  },
  {
    id: 'sl-4',
    wishlist_id: 'wl-4',
    token: 'ivan-bday-2026',
    is_active: true,
    created_at: '2026-07-05T10:00:00Z',
  },
];

export function formatRub(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso.includes('T') ? iso : `${iso}T12:00:00`));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function getUser(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getActiveBooking(giftId: string): Booking | undefined {
  return bookings.find((b) => b.gift_id === giftId && b.status === 'active');
}

export function getWishlistGifts(wishlistId: string, includeDeleted = false): Gift[] {
  return gifts.filter(
    (g) => g.wishlist_id === wishlistId && (includeDeleted || !g.deleted_at),
  );
}

export function getWishlistCategories(wishlistId: string): Category[] {
  return categories
    .filter((c) => c.wishlist_id === wishlistId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function unreadCount(userId: string): number {
  return notifications.filter((n) => n.recipient_id === userId && !n.read_at).length;
}
