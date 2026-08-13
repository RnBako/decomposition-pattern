# Технологический стек — Wishly

**Версия:** MVP  
**Основание:** `docs/requirements.md` (NFR: mobile-first RU, JWT/email+password, email + in-app уведомления, загрузки ≤5 МБ, сотни пользователей, MSA-ready)

---

## Recommended (Default)

Стек по умолчанию фреймворка `decomposition-pattern` / README — оптимален для time-to-MVP при умеренной нагрузке и готовности к разбиению на сервисы.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind | SPA mobile-first без SSR-оверхеда; Vite быстрый DX; Tailwind удобен для узких экранов и паттернов wishlist/share |
| Backend | Node.js + Express + TypeScript | Единый язык с фронтом; шаблоны репозитория; REST/JWT/multipart без лишней абстракции |
| DB | PostgreSQL 15+ (на сервис) | Soft delete, уникальность активной брони, UUID, JSON payload уведомлений; MSA-ready (БД per service) |
| Auth | JWT (access + разумный TTL) | Совпадает с ожиданием requirements; cookie-сессии не обязательны для SPA+API |
| API | REST + OpenAPI 3.1 | Контракты для gateway/BFF и генерации клиентов; публичный share + auth-эндпоинты |
| Gateway | Express API Gateway / BFF | Единая точка для SPA; маршрутизация к сервисам; заголовки auth |
| Backend tests | Vitest + supertest | Быстрые unit/integration против Express |
| Frontend tests | Vitest + Testing Library + Playwright | Компоненты + E2E mobile-сценариев (share → login → book) |
| Deploy | Docker Compose | Admin seed через env; локальный SMTP/volume; один compose на MVP |
| Events | Без брокера в MVP | In-process / sync: запись in-app + отправка email в той же операции бронирования |
| Email | SMTP (Nodemailer) + опционально Mailpit/Mailhog в dev | Best-effort email из NFR; смена на SendGrid/Mailgun — конфиг SMTP без смены кода |
| Images | Локальный volume + Express static/upload (≤5 МБ, jpeg/png/webp) | Проще ops для сотен пользователей; путь миграции на S3-compatible позже |
| Password | bcrypt или argon2 | Хеш паролей по NFR |

**Почему default подходит Wishly:** сотни пользователей не требуют брокер/S3/SSR; mobile-first закрывается SPA+Tailwind; уведомления — sync + SMTP; загрузки 5 МБ — локальный диск; JWT и OpenAPI совпадают с ожидаемым auth и MSA-пайплайном репозитория.

---

## Alternative A — Next.js frontend + NestJS backend

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | SSR/SSG для публичной share-страницы; SEO слабее критичен для B2C wishlist по ссылке |
| Backend | NestJS + TypeScript | Модули, DI, guards — удобно при росте числа доменов |
| DB / Auth / API / Deploy | PostgreSQL, JWT, REST+OpenAPI, Docker Compose | Как в default |
| Email / Images | SMTP; локальный диск или S3 | Как в default |
| Events | Без брокера в MVP | Как в default |

**Когда выбирать:** команда уже на Nest/Next; нужен SSR для share или строгая модульная структура backend с первого дня.

**Минусы для Wishly MVP:** выше сложность и время до первого деплоя; SSR не критичен для авторизованных сценариев и токен-ссылок; Nest — больше boilerplate относительно Express-шаблонов репо.

---

## Alternative B — React+Vite frontend + Fastify backend

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React + Vite + TypeScript + Tailwind | Как в Recommended |
| Backend | Node.js + Fastify + TypeScript | Schema-based validation, выше throughput на node |
| DB / Auth / API / Deploy | PostgreSQL, JWT, REST+OpenAPI, Docker Compose | Как в default |
| Gateway | Fastify BFF или тонкий gateway | Нужна адаптация шаблонов Express |
| Email / Images / Events | SMTP; local volume; sync notifications | Как в default |

**Когда выбирать:** приоритет сырой производительности API и встроенных JSON Schema; команда предпочитает Fastify.

**Минусы для Wishly MVP:** нагрузка «сотни пользователей» не оправдывает смену фреймворка; шаблоны/агенты репозитория ориентированы на Express — больше кастомизации pipeline.

---

## Сравнительная таблица trade-offs

| Критерий | Recommended (Default) | Alternative A (Next + Nest) | Alternative B (Vite + Fastify) |
|----------|----------------------|-----------------------------|-------------------------------|
| Сложность | Низкая | Высокая | Средняя |
| Time-to-MVP | Лучший | Хуже (больше каркаса) | Хороший (фронт тот же; backend — смена шаблонов) |
| Scalability | Достаточно для сотен пользователей; MSA через сервисы + PG per service | Хорошая модульность Nest; Next — лишний SSR-слой | Чуть выше потолок HTTP на node; масштабирование всё равно упирается в БД/IO |
| Ops burden | Минимальный (Compose, volume, SMTP) | Выше (Nest + Next runtime, больше сервисов в уме) | Средний (отход от Express-шаблонов) |
| Совпадение с шаблонами репо | Полное | Частичное | Частичное (frontend да, backend нет) |

---

## Специфика Wishly (MVP)

### Email / SMTP

- **MVP:** транзакционная почта через **SMTP** (Nodemailer на backend).
- **Dev:** Mailpit/Mailhog в Docker Compose для просмотра писем без внешнего провайдера.
- **Prod:** любой SMTP (корпоративный / SendGrid / Mailgun и т.п.) через env (`SMTP_HOST`, credentials) — без смены архитектуры.
- Семантика: **best-effort** + лог ошибок доставки; in-app уведомление создаётся вместе с успешным бронированием (NFR «Надёжность уведомлений»).

### Изображения

- **MVP-рекомендация:** **локальное файловое хранилище** (Docker volume), лимит **5 МБ**, типы jpeg/png/webp.
- Внешний `image_url` хранится как URL без проксирования контента в MVP.
- **S3-compatible** — не обязателен на старте; заложить интерфейс storage (local → S3) в архитектуре, миграция при росте или multi-instance без общего диска.

### Message broker и уведомления

- **Брокер (RabbitMQ/Kafka и т.п.) для MVP не нужен.**
- Доставка: **in-process / синхронно** в операции booking create/cancel: запись `Notification` + попытка SMTP.
- Асинхронная очередь/брокер — после MVP, если появятся ретраи email, fan-out или отдельные read models.

### Прочее

- Admin: seed при первом деплое из env (как в requirements).
- Soft delete и уникальность активной брони — на уровне PostgreSQL + доменных правил.
- Публичный share: REST по токену; имя booker не в публичных DTO.

---

## Decision

**Выбран:** Recommended (Default) — React + Vite + TypeScript + Tailwind; Node.js + Express + TypeScript; PostgreSQL 15+ per service; JWT; REST + OpenAPI 3.1; Express Gateway/BFF; Vitest + supertest; Vitest + Testing Library + Playwright; Docker Compose; SMTP (Mailpit в dev); локальный volume для изображений.

**Уточнение batch approvals:** message broker — **Kafka** (переопределяет рекомендацию «без брокера в MVP»); object storage — локальный volume; CI — GitHub Actions; deploy — local Docker Compose; domain — localhost.

Утверждено пользователем.
