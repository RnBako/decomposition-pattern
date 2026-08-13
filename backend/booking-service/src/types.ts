export type BookingStatus = 'active' | 'cancelled';
export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export interface BookingRow {
  id: string;
  gift_id: string;
  booker_id: string;
  status: BookingStatus;
  gift_title: string;
  wishlist_id: string;
  wishlist_owner_id: string;
  booking_deadline: Date;
  booker_display_name: string;
  booker_email: string;
  cancelled_at: Date | null;
  cancelled_by_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookingDto {
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
  cancelled_at: string | null;
  cancelled_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  gift_id: string;
  gift_title: string;
  wishlist_id: string;
  wishlist_owner_id: string;
  booking_deadline: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toBookingDto(
  row: BookingRow,
  options: { includeBookerEmail?: boolean } = {},
): BookingDto {
  const dto: BookingDto = {
    id: row.id,
    gift_id: row.gift_id,
    booker_id: row.booker_id,
    status: row.status,
    gift_title: row.gift_title,
    wishlist_id: row.wishlist_id,
    wishlist_owner_id: row.wishlist_owner_id,
    booking_deadline: row.booking_deadline.toISOString(),
    booker_display_name: row.booker_display_name,
    cancelled_at: row.cancelled_at ? row.cancelled_at.toISOString() : null,
    cancelled_by_id: row.cancelled_by_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
  if (options.includeBookerEmail !== false) {
    dto.booker_email = row.booker_email;
  }
  return dto;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
