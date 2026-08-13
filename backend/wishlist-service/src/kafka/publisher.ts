import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from '../config';

export type WishlistEventType =
  | 'WishlistShared'
  | 'ShareLinkRevoked'
  | 'GiftSoftDeleted'
  | 'WishlistSoftDeleted';

export interface WishlistEvent {
  type: WishlistEventType;
  key: string;
  payload: Record<string, unknown>;
}

let producer: Producer | null = null;
let connecting: Promise<Producer | null> | null = null;
let disabled = false;

async function getProducer(): Promise<Producer | null> {
  if (disabled) return null;
  if (producer) return producer;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      const kafka = new Kafka({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        logLevel: logLevel.NOTHING,
        retry: { retries: 0 },
        connectionTimeout: 1000,
        requestTimeout: 1000,
      });
      const p = kafka.producer();
      await p.connect();
      producer = p;
      return p;
    } catch {
      disabled = true;
      producer = null;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

export async function publishEvent(event: WishlistEvent): Promise<void> {
  try {
    const p = await getProducer();
    if (!p) return;
    await p.send({
      topic: config.kafkaTopic,
      messages: [
        {
          key: event.key,
          value: JSON.stringify({
            type: event.type,
            ...event.payload,
          }),
        },
      ],
    });
  } catch {
    // no-op if Kafka is down (tests / local without broker)
    disabled = true;
  }
}

export function resetKafkaForTests(): void {
  producer = null;
  connecting = null;
  disabled = false;
}
