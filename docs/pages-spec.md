# Спецификация страниц — Wishly (MVP)

**Основание:** `docs/requirements.md`, `docs/tech-stack.md` (SPA React + Vite)  
**Язык UI:** русский  
**Формат маршрутов:** клиентский роутинг SPA

---

## Маршруты и экраны

| Route | Page | Functionality | Roles |
|-------|------|---------------|-------|
| `/login` | Вход | Форма email + пароль; ошибки без лишних деталей; редирект после успеха на `returnUrl` (если был) или на `/`; ссылка на регистрацию | Guest (anon); All authenticated (редирект на `/` если уже вошёл) |
| `/register` | Регистрация | Форма: email, пароль, display_name; создание аккаунта `role=user`; после успеха — вход и редирект на `returnUrl` или `/`; ссылка на вход | Guest (anon) |
| `/logout` | Выход (действие) | Инвалидация/очистка JWT на клиенте; редирект на `/login`. Отдельный UI-экран не обязателен — POST/действие из меню | All authenticated |
| `/` | Дашборд / мои вишлисты | Редирект на `/wishlists` **или** краткий дашборд: список своих вишлистов (title, event_date, booking_deadline, кол-во подарков/броней), CTA «Создать вишлист», бейдж непрочитанных уведомлений. Soft-deleted по умолчанию скрыты | All authenticated (Owner / Admin / Registered guest) |
| `/wishlists` | Список вишлистов | Список вишлистов текущего пользователя; фильтр/переключатель «Активные / Удалённые (soft)»; создание → `/wishlists/new`; открытие → `/wishlists/:id`; лимит MVP: до 20 вишлистов | Owner (свои); Admin может не видеть чужие здесь (свой список как у user) |
| `/wishlists/new` | Создание вишлиста | Форма: title (обяз.), description (опц.), event_date, booking_deadline; валидация deadline ≤ event_date; сохранение и переход на `/wishlists/:id` | Owner (All authenticated с правом создавать) |
| `/wishlists/:id` | Детали вишлиста | Категории (CRUD inline/модалка); список подарков по категориям и без; статусы броней с **именем booker** для владельца; комментарии к wishlist/gift (только owner); управление ShareLink (копировать, отозвать, выпустить новую); отмена брони на своих подарках; soft-delete wishlist/gift; restore если `deleted_at` и просмотр удалённых; CTA добавить/редактировать подарок | Owner (свои); Admin (просмотр/модерация soft-delete и броней — см. `/admin`) |
| `/wishlists/:id/edit` | Редактирование вишлиста | Изменение title, description, event_date, booking_deadline; те же валидации; нельзя редактировать soft-deleted без restore | Owner (свои) |
| `/wishlists/:id/gifts/new` | Добавление подарка | Форма или **modal on `/wishlists/:id`**: title, url, price (RUB), category (опц.), notes (опц.), image_url и/или загрузка файла ≤5 МБ (jpeg/png/webp); лимит до 200 подарков на вишлист | Owner (свои) |
| `/wishlists/:id/gifts/:giftId/edit` | Редактирование подарка | Форма или **modal on `/wishlists/:id`**: те же поля; замена изображения; soft-delete / restore | Owner (свои) |
| `/wishlists/:id/trash` | Удалённые (soft) | Список soft-deleted wishlist-контекста: удалённые подарки (и опционально сам вишлист, если открыт из trash); действия restore Owner; альтернатива — фильтр на `/wishlists` и секция на `/wishlists/:id` без отдельного URL | Owner (свои); Admin (через модерацию) |
| `/notifications` | Уведомления | Список in-app: `booking_created`, `booking_cancelled`; payload (wishlist/gift/booker по правам); mark as read; переход к связанному вишлисту | Owner (получатель); All authenticated (свои уведомления) |
| `/my-bookings` | Мои бронирования | Список активных (и опционально отменённых) броней текущего пользователя как booker; отмена своей брони до `booking_deadline`; ссылка на публичный вишлист `/w/:token` если доступен | Registered guest / All authenticated (как booker) |
| `/w/:token` | Публичный вишлист (share) | Просмотр wishlist + gifts + статусы «свободен / забронировано» **без имён booker**; **без комментариев**; кнопка «Забронировать» на свободном подарке; до дедлайна и при активной ссылке; аноним → редирект на `/login?returnUrl=/w/:token` (или register); после auth — подтверждение брони; отозванный токен / soft-deleted — 404 или «ссылка недоступна» | Guest (anon) — view; Registered guest / All authenticated — view + book (не своих подарков); Owner — view (бронь своих запрещена) |
| `/admin` | Админ-панель (MVP) | Модерация: поиск/список бронирований (имя booker), отмена брони; soft-delete / restore wishlist и gift; просмотр роли пользователя (минимально). Audit log — вне MVP | Admin |
| `*` / `/404` | Страница 404 | Сообщение «Страница не найдена»; ссылки на `/` или `/wishlists` (если auth) и на `/login` | All (Guest, Registered guest, Owner, Admin) |

---

## Навигация (кратко)

| Зона | Пункты | Видимость |
|------|--------|-----------|
| Публичная / auth | Вход, Регистрация | Guest (anon) |
| Основное меню (auth) | Мои вишлисты (`/` или `/wishlists`), Уведомления, Мои бронирования, Выход | All authenticated |
| Контекст вишлиста | Обзор, Редактировать, Поделиться, Удалённые | Owner на своих |
| Admin | пункт «Админ» → `/admin` | только `role=admin` |
| Share | автономная страница без owner-меню; CTA вход/регистрация при брони | Guest / Registered guest |

**Поток бронирования:** `/w/:token` → (если anon) `/login` или `/register` с `returnUrl` → возврат на `/w/:token` → подтверждение book → обновление статуса; уведомления owner (email + in-app).

**Logout:** действие из меню, маршрут `/logout` опционален как явный path для SPA.

---

## Mobile-first: приоритет узкого viewport

Ключевые экраны для удобства на узком экране (NFR Amazon Wishlist–like):

1. `/w/:token` — просмотр и бронь (главный гостевой сценарий)
2. `/wishlists/new` + `/wishlists/:id` — создание вишлиста и добавление подарков (модалки предпочтительны на mobile)
3. `/login` / `/register` — короткий return-flow к share
4. `/wishlists` — список своих вишлистов
5. `/notifications` — быстрый просмотр броней
6. `/my-bookings` — отмена своей брони
7. `/admin` — допустим упрощённый табличный UI; не блокирует mobile-first для B2C

Рекомендации UX: крупные CTA брони/создания; формы в одну колонку; пагинация длинных списков подарков; изображения с ленивой загрузкой на share.

---

## Заметки для реализации

- Gift create/edit: допустимы отдельные routes **или** modal on `/wishlists/:id`; оба варианта зафиксированы в таблице — выбрать один на этапе прототипа/frontend, маршруты выше остаются каноническими для deep-link.
- `/wishlists/:id/trash` можно заменить фильтром на `/wishlists` + секцией на деталях; наличие soft-delete UX обязательно.
- `/` = redirect на `/wishlists` допустим без отдельного дашборд-виджета в MVP.
- Имя booker не показывать на `/w/:token`; показывать на `/wishlists/:id` (owner) и `/admin`.
