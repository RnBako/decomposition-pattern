import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://wishly:wishly@localhost:5432/wishly_booking',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'booking-service',
  kafkaBookingEventsTopic:
    process.env.KAFKA_BOOKING_EVENTS_TOPIC || 'wishly.booking.events',
  kafkaNotificationCommandsTopic:
    process.env.KAFKA_NOTIFICATION_COMMANDS_TOPIC ||
    'wishly.notification.commands',
};
