import { apiFetch } from './client';
import type {
  MarkAllReadResponse,
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from './types';

export function listNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const qs = q.toString();
  return apiFetch<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ''}`);
}

export function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>('/notifications/unread-count');
}

export function markAllRead(): Promise<MarkAllReadResponse> {
  return apiFetch<MarkAllReadResponse>('/notifications/read-all', { method: 'POST' });
}

export function markRead(notificationId: string): Promise<Notification> {
  return apiFetch<Notification>(`/notifications/${notificationId}/read`, { method: 'POST' });
}
