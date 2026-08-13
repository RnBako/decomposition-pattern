import dotenv from 'dotenv';

dotenv.config();

function env(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  get port() {
    return parseInt(env('PORT', '3004'), 10);
  },
  get databaseUrl() {
    return env(
      'DATABASE_URL',
      'postgresql://wishly:wishly@localhost:5432/wishly_notification',
    );
  },
  get nodeEnv() {
    return env('NODE_ENV', 'development');
  },
  get jwtSecret() {
    return env('JWT_SECRET', 'change-me-in-production');
  },
  get kafkaBrokers() {
    return env('KAFKA_BROKERS', 'localhost:9092')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  },
  get kafkaClientId() {
    return env('KAFKA_CLIENT_ID', 'notification-service');
  },
  get kafkaGroupId() {
    return env('KAFKA_GROUP_ID', 'notification-service');
  },
  get kafkaBookingEventsTopic() {
    return env('KAFKA_BOOKING_EVENTS_TOPIC', 'wishly.booking.events');
  },
  get kafkaNotificationCommandsTopic() {
    return env(
      'KAFKA_NOTIFICATION_COMMANDS_TOPIC',
      'wishly.notification.commands',
    );
  },
  get kafkaDisabled() {
    return (
      process.env.KAFKA_DISABLED === 'true' || process.env.NODE_ENV === 'test'
    );
  },
  get smtp() {
    return {
      host: env('SMTP_HOST', ''),
      port: parseInt(env('SMTP_PORT', '1025'), 10),
      user: env('SMTP_USER', ''),
      pass: env('SMTP_PASS', ''),
      from: env('SMTP_FROM', 'noreply@wishly.local'),
      secure: process.env.SMTP_SECURE === 'true',
    };
  },
};
