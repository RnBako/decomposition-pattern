import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from '../config';
import { BookingRow } from '../types';

export interface EventPublisher {
  publishBookingCreated(booking: BookingRow): Promise<void>;
  publishBookingCancelled(booking: BookingRow): Promise<void>;
  disconnect(): Promise<void>;
}

class NoopPublisher implements EventPublisher {
  async publishBookingCreated(): Promise<void> {}
  async publishBookingCancelled(): Promise<void> {}
  async disconnect(): Promise<void> {}
}

class KafkaPublisher implements EventPublisher {
  private producer: Producer;
  private connected = false;

  constructor() {
    const kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
      logLevel: logLevel.ERROR,
    });
    this.producer = kafka.producer();
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  private async send(
    topic: string,
    key: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.ensureConnected();
      await this.producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(payload) }],
      });
    } catch (err) {
      console.error('Kafka publish failed:', err);
    }
  }

  async publishBookingCreated(booking: BookingRow): Promise<void> {
    const occurredAt = new Date().toISOString();
    await this.send(config.kafkaBookingEventsTopic, booking.id, {
      event_type: 'BookingCreated',
      booking_id: booking.id,
      gift_id: booking.gift_id,
      wishlist_id: booking.wishlist_id,
      wishlist_owner_id: booking.wishlist_owner_id,
      booker_id: booking.booker_id,
      gift_title: booking.gift_title,
      booker_display_name: booking.booker_display_name,
      booking_deadline: booking.booking_deadline.toISOString(),
      occurred_at: occurredAt,
    });

    await this.send(config.kafkaNotificationCommandsTopic, booking.id, {
      event_type: 'NotificationRequested',
      type: 'booking_created',
      recipient_id: booking.wishlist_owner_id,
      channels: ['in_app', 'email'],
      payload: {
        wishlist_id: booking.wishlist_id,
        gift_id: booking.gift_id,
        booker_id: booking.booker_id,
        booking_id: booking.id,
        gift_title: booking.gift_title,
        booker_display_name: booking.booker_display_name,
      },
      occurred_at: occurredAt,
    });
  }

  async publishBookingCancelled(booking: BookingRow): Promise<void> {
    const occurredAt = new Date().toISOString();
    const cancelledById = booking.cancelled_by_id || booking.booker_id;

    await this.send(config.kafkaBookingEventsTopic, booking.id, {
      event_type: 'BookingCancelled',
      booking_id: booking.id,
      gift_id: booking.gift_id,
      wishlist_id: booking.wishlist_id,
      wishlist_owner_id: booking.wishlist_owner_id,
      booker_id: booking.booker_id,
      cancelled_by_id: cancelledById,
      gift_title: booking.gift_title,
      booker_display_name: booking.booker_display_name,
      occurred_at: occurredAt,
    });

    const notifyOwner = {
      event_type: 'NotificationRequested',
      type: 'booking_cancelled',
      recipient_id: booking.wishlist_owner_id,
      channels: ['in_app', 'email'],
      payload: {
        wishlist_id: booking.wishlist_id,
        gift_id: booking.gift_id,
        booker_id: booking.booker_id,
        booking_id: booking.id,
        gift_title: booking.gift_title,
        booker_display_name: booking.booker_display_name,
      },
      occurred_at: occurredAt,
    };

    await this.send(
      config.kafkaNotificationCommandsTopic,
      booking.id,
      notifyOwner,
    );

    // Admin/owner cancel → also notify booker
    if (
      cancelledById !== booking.booker_id &&
      booking.booker_id !== booking.wishlist_owner_id
    ) {
      await this.send(config.kafkaNotificationCommandsTopic, booking.id, {
        ...notifyOwner,
        recipient_id: booking.booker_id,
        recipient_email: booking.booker_email,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

let publisher: EventPublisher | null = null;

export function getEventPublisher(): EventPublisher {
  if (publisher) return publisher;
  if (config.nodeEnv === 'test' || process.env.KAFKA_DISABLED === 'true') {
    publisher = new NoopPublisher();
  } else {
    publisher = new KafkaPublisher();
  }
  return publisher;
}

export function setEventPublisher(p: EventPublisher): void {
  publisher = p;
}
