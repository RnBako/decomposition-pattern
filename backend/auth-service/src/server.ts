import { createApp } from './app';
import { config } from './config';
import { pool } from './db/pool';
import { runMigrations } from './db/migrate';
import { seedAdmin } from './services/adminSeed';
import { createKafkaPublisher, createNoopPublisher } from './services/kafka';

async function main(): Promise<void> {
  await runMigrations(pool);

  await seedAdmin(pool, {
    email: config.adminEmail,
    password: config.adminPassword,
    displayName: config.adminDisplayName,
  });

  const events = config.kafkaBrokers.length
    ? createKafkaPublisher({
        brokers: config.kafkaBrokers,
        clientId: config.kafkaClientId,
        topic: config.kafkaTopicAuthEvents,
      })
    : createNoopPublisher();

  const app = createApp({ db: pool, events });
  app.listen(config.port, () => {
    console.log(`auth-service listening on port ${config.port}`);
  });

  const shutdown = async () => {
    await events.disconnect();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
