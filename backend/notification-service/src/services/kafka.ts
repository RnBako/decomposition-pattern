import { Kafka, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { config } from '../config';
import {
  NotificationPayload,
  NotificationType,
  parseNotificationType,
} from '../types';
import { createNotification } from './notifications';

function asRecord(value: Buffer | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value.toString('utf-8')) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function payloadFromBookingEvent(
  msg: Record<string, unknown>,
): NotificationPayload {
  return {
    wishlist_id: String(msg.wishlist_id || ''),
    gift_id: String(msg.gift_id || ''),
    booker_id: String(msg.booker_id || ''),
    booking_id: msg.booking_id ? String(msg.booking_id) : undefined,
    gift_title: msg.gift_title ? String(msg.gift_title) : undefined,
    booker_display_name: msg.booker_display_name
      ? String(msg.booker_display_name)
      : undefined,
    wishlist_title: msg.wishlist_title
      ? String(msg.wishlist_title)
      : undefined,
  };
}

async function handleBookingCreated(msg: Record<string, unknown>): Promise<void> {
  const recipientId = String(msg.wishlist_owner_id || '');
  if (!recipientId) {
    console.warn('BookingCreated missing wishlist_owner_id');
    return;
  }
  await createNotification({
    recipientId,
    type: 'booking_created',
    payload: payloadFromBookingEvent(msg),
    recipientEmail:
      (msg.recipient_email as string | undefined) ||
      (msg.owner_email as string | undefined) ||
      null,
    channels: ['in_app', 'email'],
  });
}

async function handleBookingCancelled(
  msg: Record<string, unknown>,
): Promise<void> {
  const recipientId = String(msg.wishlist_owner_id || '');
  if (!recipientId) {
    console.warn('BookingCancelled missing wishlist_owner_id');
    return;
  }
  await createNotification({
    recipientId,
    type: 'booking_cancelled',
    payload: payloadFromBookingEvent(msg),
    recipientEmail:
      (msg.recipient_email as string | undefined) ||
      (msg.owner_email as string | undefined) ||
      null,
    channels: ['in_app', 'email'],
  });
}

async function handleNotificationRequested(
  msg: Record<string, unknown>,
): Promise<void> {
  const type = parseNotificationType(msg.type);
  if (!type) {
    console.warn('NotificationRequested unknown type:', msg.type);
    return;
  }
  const recipientId = String(msg.recipient_id || '');
  if (!recipientId) {
    console.warn('NotificationRequested missing recipient_id');
    return;
  }

  const rawPayload =
    msg.payload && typeof msg.payload === 'object'
      ? (msg.payload as Record<string, unknown>)
      : {};

  const payload: NotificationPayload = {
    wishlist_id: String(rawPayload.wishlist_id || ''),
    gift_id: String(rawPayload.gift_id || ''),
    booker_id: String(rawPayload.booker_id || ''),
    booking_id: rawPayload.booking_id
      ? String(rawPayload.booking_id)
      : undefined,
    gift_title: rawPayload.gift_title
      ? String(rawPayload.gift_title)
      : undefined,
    booker_display_name: rawPayload.booker_display_name
      ? String(rawPayload.booker_display_name)
      : undefined,
    wishlist_title: rawPayload.wishlist_title
      ? String(rawPayload.wishlist_title)
      : undefined,
  };

  const channels = Array.isArray(msg.channels)
    ? (msg.channels as string[])
    : ['in_app', 'email'];

  await createNotification({
    recipientId,
    type: type as NotificationType,
    payload,
    channels,
    recipientEmail: msg.recipient_email
      ? String(msg.recipient_email)
      : null,
  });
}

async function dispatch(
  topic: string,
  msg: Record<string, unknown>,
): Promise<void> {
  const eventType = String(msg.event_type || '');

  if (topic === config.kafkaBookingEventsTopic) {
    if (eventType === 'BookingCreated') {
      await handleBookingCreated(msg);
      return;
    }
    if (eventType === 'BookingCancelled') {
      await handleBookingCancelled(msg);
      return;
    }
  }

  if (topic === config.kafkaNotificationCommandsTopic) {
    if (eventType === 'NotificationRequested') {
      await handleNotificationRequested(msg);
      return;
    }
  }
}

export interface EventConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

class NoopConsumer implements EventConsumer {
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}

class KafkaEventConsumer implements EventConsumer {
  private consumer: Consumer;
  private running = false;

  constructor() {
    const kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
      logLevel: logLevel.ERROR,
    });
    this.consumer = kafka.consumer({ groupId: config.kafkaGroupId });
  }

  async start(): Promise<void> {
    if (this.running) return;
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: config.kafkaBookingEventsTopic,
      fromBeginning: false,
    });
    await this.consumer.subscribe({
      topic: config.kafkaNotificationCommandsTopic,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        const msg = asRecord(message.value);
        if (!msg) {
          console.warn('Skipping invalid Kafka message on', topic);
          return;
        }
        try {
          await dispatch(topic, msg);
        } catch (err) {
          console.error('Kafka message handling failed:', err);
        }
      },
    });

    this.running = true;
    console.log(
      `Kafka consumer started (group=${config.kafkaGroupId}) topics=[${config.kafkaBookingEventsTopic}, ${config.kafkaNotificationCommandsTopic}]`,
    );
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    await this.consumer.disconnect();
    this.running = false;
  }
}

let consumer: EventConsumer | null = null;

export function getEventConsumer(): EventConsumer {
  if (consumer) return consumer;
  if (config.kafkaDisabled) {
    consumer = new NoopConsumer();
  } else {
    consumer = new KafkaEventConsumer();
  }
  return consumer;
}

export function setEventConsumer(c: EventConsumer): void {
  consumer = c;
}
