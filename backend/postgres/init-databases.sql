-- Wishly local MVP: one PostgreSQL instance, four service databases (Database-per-Service).
-- Choice documented in docker-compose.yaml header.

CREATE DATABASE wishly_auth;
CREATE DATABASE wishly_wishlist;
CREATE DATABASE wishly_booking;
CREATE DATABASE wishly_notification;

GRANT ALL PRIVILEGES ON DATABASE wishly_auth TO wishly;
GRANT ALL PRIVILEGES ON DATABASE wishly_wishlist TO wishly;
GRANT ALL PRIVILEGES ON DATABASE wishly_booking TO wishly;
GRANT ALL PRIVILEGES ON DATABASE wishly_notification TO wishly;
