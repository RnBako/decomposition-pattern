/** Types derived from docs/*-service/api.yaml (gateway routes under /api). */

export type UserRole = 'user' | 'admin';

export interface ApiErrorBody {
  error: string;
  message?: string;
  code?: string;
}

export interface UserPublic {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in?: number;
  user: UserPublic;
}

export interface WishlistCreate {
  title: string;
  description?: string | null;
  event_date: string;
  booking_deadline: string;
}

export interface WishlistUpdate {
  title?: string;
  description?: string | null;
  event_date?: string;
  booking_deadline?: string;
}

export interface Wishlist {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  booking_deadline: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WishlistSummary extends Wishlist {
  gifts_count?: number;
  categories_count?: number;
  has_active_share_link?: boolean;
}

export interface Category {
  id: string;
  wishlist_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  sort_order?: number;
}

export interface Gift {
  id: string;
  wishlist_id: string;
  category_id?: string | null;
  title: string;
  url: string;
  price: number;
  currency: 'RUB';
  image_url?: string | null;
  image_storage_key?: string | null;
  notes?: string | null;
  is_occupied?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface GiftCreate {
  title: string;
  url: string;
  price: number;
  currency?: 'RUB';
  category_id?: string | null;
  image_url?: string | null;
  notes?: string | null;
}

export interface GiftUpdate {
  title?: string;
  url?: string;
  price?: number;
  currency?: 'RUB';
  category_id?: string | null;
  image_url?: string | null;
  notes?: string | null;
}

export interface ShareLink {
  id: string;
  wishlist_id: string;
  token: string;
  is_active: boolean;
  public_path: string;
  created_at: string;
  updated_at: string;
  revoked_at?: string | null;
}

export interface WishlistDetail extends Wishlist {
  categories?: Category[];
  gifts?: Gift[];
  share_link?: ShareLink | null;
}

export interface PublicGift {
  id: string;
  category_id?: string | null;
  title: string;
  url: string;
  price: number;
  currency: 'RUB';
  image_url?: string | null;
  notes?: string | null;
  is_occupied: boolean;
}

export interface PublicShareView {
  wishlist: {
    id: string;
    owner_id?: string;
    title: string;
    description?: string | null;
    event_date: string;
    booking_deadline: string;
    booking_open?: boolean;
  };
  categories: Category[];
  gifts: PublicGift[];
}

export interface CommentCreate {
  body: string;
}

export interface Comment {
  id: string;
  author_id: string;
  author_display_name?: string;
  wishlist_id?: string | null;
  gift_id?: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type BookingStatus = 'active' | 'cancelled';

export interface CreateBookingRequest {
  gift_id: string;
  gift_title: string;
  wishlist_id: string;
  wishlist_owner_id: string;
  booking_deadline: string;
}

export interface Booking {
  id: string;
  gift_id: string;
  booker_id: string;
  status: BookingStatus;
  gift_title: string;
  wishlist_id: string;
  wishlist_owner_id: string;
  booking_deadline: string;
  booker_display_name: string;
  booker_email?: string;
  cancelled_at?: string | null;
  cancelled_by_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingListResponse {
  items: Booking[];
  page: number;
  page_size: number;
  total: number;
}

export interface PublicGiftBookingStatus {
  gift_id: string;
  is_booked: boolean;
  booking_id?: string | null;
  status?: 'available' | 'booked';
}

export interface PublicBookingStatusResponse {
  items: PublicGiftBookingStatus[];
}

export type NotificationType = 'booking_created' | 'booking_cancelled';

export interface NotificationPayload {
  wishlist_id: string;
  gift_id: string;
  booker_id: string;
  booking_id?: string;
  wishlist_title?: string;
  gift_title?: string;
  booker_display_name?: string;
}

export interface ChannelFlags {
  in_app: boolean;
  email: boolean;
  email_error?: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  channel_flags: ChannelFlags;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}

export interface WishlistListResponse {
  items: WishlistSummary[];
}
