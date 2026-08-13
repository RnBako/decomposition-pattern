export type UserRole = 'user' | 'admin';

export type NotificationType = 'booking_created' | 'booking_cancelled';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

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
  email_error: string | null;
}

export interface NotificationRow {
  id: string;
  recipient_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: Date | null;
  in_app_delivered: boolean;
  email_sent: boolean;
  email_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationDto {
  id: string;
  recipient_id: string;
  type: NotificationType;
  payload: NotificationPayload;
  channel_flags: ChannelFlags;
  read_at: string | null;
  created_at: string;
  updated_at: string;
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

export function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    recipient_id: row.recipient_id,
    type: row.type,
    payload: row.payload,
    channel_flags: {
      in_app: row.in_app_delivered,
      email: row.email_sent,
      email_error: row.email_error,
    },
    read_at: row.read_at ? row.read_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function parseNotificationType(value: unknown): NotificationType | null {
  if (value === 'booking_created' || value === 'booking_cancelled') {
    return value;
  }
  return null;
}
