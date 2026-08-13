import { pool } from '../db/pool';
import {
  NotificationPayload,
  NotificationRow,
  NotificationType,
} from '../types';
import { sendNotificationEmail } from './email';

function mapRow(row: Record<string, unknown>): NotificationRow {
  const payload =
    typeof row.payload === 'string'
      ? (JSON.parse(row.payload) as NotificationPayload)
      : (row.payload as NotificationPayload);

  return {
    id: String(row.id),
    recipient_id: String(row.recipient_id),
    type: row.type as NotificationType,
    payload,
    read_at: row.read_at ? new Date(String(row.read_at)) : null,
    in_app_delivered: Boolean(row.in_app_delivered),
    email_sent: Boolean(row.email_sent),
    email_error: row.email_error != null ? String(row.email_error) : null,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export async function findExistingNotification(params: {
  recipientId: string;
  type: NotificationType;
  bookingId?: string;
}): Promise<NotificationRow | null> {
  if (!params.bookingId) return null;
  const { rows } = await pool.query(
    `SELECT * FROM notifications
     WHERE recipient_id = $1
       AND type = $2
       AND payload->>'booking_id' = $3
     LIMIT 1`,
    [params.recipientId, params.type, params.bookingId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  payload: NotificationPayload;
  channels?: string[];
  recipientEmail?: string | null;
}): Promise<NotificationRow> {
  const channels = params.channels ?? ['in_app', 'email'];
  const wantInApp = channels.includes('in_app');
  const wantEmail = channels.includes('email');

  const existing = await findExistingNotification({
    recipientId: params.recipientId,
    type: params.type,
    bookingId: params.payload.booking_id,
  });
  if (existing) {
    return existing;
  }

  let emailSent = false;
  let emailError: string | null = null;

  if (wantEmail) {
    const result = await sendNotificationEmail({
      to: params.recipientEmail,
      type: params.type,
      payload: params.payload,
    });
    emailSent = result.sent;
    emailError = result.error;
  }

  const { rows } = await pool.query(
    `INSERT INTO notifications (
       recipient_id, type, payload,
       in_app_delivered, email_sent, email_error
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING *`,
    [
      params.recipientId,
      params.type,
      JSON.stringify(params.payload),
      wantInApp,
      emailSent,
      emailError,
    ],
  );

  return mapRow(rows[0]);
}

export async function listNotifications(params: {
  recipientId: string;
  unreadOnly: boolean;
  limit: number;
  offset: number;
}): Promise<{ items: NotificationRow[]; total: number }> {
  const where = params.unreadOnly
    ? 'WHERE recipient_id = $1 AND read_at IS NULL'
    : 'WHERE recipient_id = $1';

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM notifications ${where}`,
    [params.recipientId],
  );
  const total = countRes.rows[0]?.total ?? 0;

  const { rows } = await pool.query(
    `SELECT * FROM notifications ${where}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [params.recipientId, params.limit, params.offset],
  );

  return { items: rows.map(mapRow), total };
}

export async function getUnreadCount(recipientId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE recipient_id = $1 AND read_at IS NULL`,
    [recipientId],
  );
  return rows[0]?.count ?? 0;
}

export async function markAllRead(recipientId: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE notifications
     SET read_at = NOW(), updated_at = NOW()
     WHERE recipient_id = $1 AND read_at IS NULL`,
    [recipientId],
  );
  return rowCount ?? 0;
}

export async function getById(id: string): Promise<NotificationRow | null> {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE id = $1',
    [id],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function markRead(
  id: string,
  recipientId: string,
): Promise<'ok' | 'forbidden' | 'not_found'> {
  const row = await getById(id);
  if (!row) return 'not_found';
  if (row.recipient_id !== recipientId) return 'forbidden';
  if (row.read_at) return 'ok';

  await pool.query(
    `UPDATE notifications
     SET read_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL`,
    [id, recipientId],
  );
  return 'ok';
}
