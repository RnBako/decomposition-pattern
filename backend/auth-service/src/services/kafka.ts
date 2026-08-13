import { Kafka, Producer, logLevel } from 'kafkajs';

export type UserRegisteredEvent = {
  type: 'UserRegistered';
  occurred_at: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: string;
  };
};

export type EventPublisher = {
  publishUserRegistered: (event: UserRegisteredEvent) => Promise<void>;
  disconnect: () => Promise<void>;
};

export function createNoopPublisher(): EventPublisher {
  return {
    async publishUserRegistered() {
      /* no-op when Kafka unavailable / unset */
    },
    async disconnect() {
      /* no-op */
    },
  };
}

export function createKafkaPublisher(options: {
  brokers: string[];
  clientId: string;
  topic: string;
}): EventPublisher {
  if (!options.brokers.length) {
    return createNoopPublisher();
  }

  let producer: Producer | null = null;
  let connected = false;

  async function getProducer(): Promise<Producer | null> {
    if (connected && producer) return producer;
    try {
      const kafka = new Kafka({
        clientId: options.clientId,
        brokers: options.brokers,
        logLevel: logLevel.ERROR,
        retry: { retries: 1 },
      });
      producer = kafka.producer();
      await producer.connect();
      connected = true;
      return producer;
    } catch (err) {
      console.warn('[kafka] connect failed, publish will no-op:', (err as Error).message);
      producer = null;
      connected = false;
      return null;
    }
  }

  return {
    async publishUserRegistered(event: UserRegisteredEvent): Promise<void> {
      try {
        const p = await getProducer();
        if (!p) return;
        await p.send({
          topic: options.topic,
          messages: [
            {
              key: event.user.id,
              value: JSON.stringify(event),
            },
          ],
        });
      } catch (err) {
        console.warn('[kafka] publish UserRegistered failed:', (err as Error).message);
      }
    },
    async disconnect(): Promise<void> {
      if (producer && connected) {
        try {
          await producer.disconnect();
        } catch {
          /* ignore */
        }
      }
      producer = null;
      connected = false;
    },
  };
}
