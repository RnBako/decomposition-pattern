import nodemailer from 'nodemailer';
import { config } from '../config';
import { NotificationPayload, NotificationType } from '../types';

export interface EmailResult {
  sent: boolean;
  error: string | null;
}

function subjectFor(type: NotificationType, payload: NotificationPayload): string {
  const gift = payload.gift_title || 'подарок';
  if (type === 'booking_created') {
    return `Подарок «${gift}» забронирован`;
  }
  return `Бронь подарка «${gift}» отменена`;
}

function bodyFor(type: NotificationType, payload: NotificationPayload): string {
  const gift = payload.gift_title || 'подарок';
  const booker = payload.booker_display_name || 'кто-то';
  const wishlist = payload.wishlist_title ? ` (вишлист «${payload.wishlist_title}»)` : '';
  if (type === 'booking_created') {
    return `${booker} забронировал(а) «${gift}»${wishlist}.`;
  }
  return `Бронь подарка «${gift}»${wishlist} отменена.`;
}

export async function sendNotificationEmail(params: {
  to: string | undefined | null;
  type: NotificationType;
  payload: NotificationPayload;
}): Promise<EmailResult> {
  const { to, type, payload } = params;

  if (!to) {
    const error = 'recipient email missing';
    console.warn(`SMTP skipped: ${error}`);
    return { sent: false, error };
  }

  if (!config.smtp.host) {
    const error = 'SMTP_HOST not configured';
    console.warn(`SMTP skipped: ${error}`);
    return { sent: false, error };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user || config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
    });

    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: subjectFor(type, payload),
      text: bodyFor(type, payload),
    });

    return { sent: true, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('SMTP send failed:', error);
    return { sent: false, error };
  }
}
