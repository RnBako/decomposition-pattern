import { createApp } from './app';
import { config } from './config';
import { getEventConsumer } from './services/kafka';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`notification-service listening on port ${config.port}`);
});

const consumer = getEventConsumer();
consumer.start().catch((err) => {
  console.error('Failed to start Kafka consumer:', err);
});

async function shutdown(): Promise<void> {
  try {
    await consumer.stop();
  } catch (err) {
    console.error('Error stopping Kafka consumer:', err);
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
