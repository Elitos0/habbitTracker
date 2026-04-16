# Habit Tracker — Документация по запуску и деплою

## Содержание

- [Архитектура](#архитектура)
- [Требования](#требования)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Генерация секретов](#генерация-секретов)
- [Настройка Google OAuth](#настройка-google-oauth)
- [Переменные окружения](#переменные-окружения)
- [Локальная разработка](#локальная-разработка)
- [Деплой на VPS](#деплой-на-vps)
- [Android-сборка](#android-сборка)
- [Структура проекта](#структура-проекта)
- [Управление и обслуживание](#управление-и-обслуживание)
- [Порты](#порты)
- [Траблшутинг](#траблшутинг)

---

## Архитектура

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   Клиенты       │     │  Docker Compose                      │
│                 │     │                                      │
│  Браузер (:3000)│────▶│  nginx (web)                         │
│  Android (APK)  │     │    └─ Expo static build              │
│                 │     │                                      │
│                 │────▶│  Kong (:8000) ─── API Gateway         │
│                 │     │    ├─ GoTrue (Auth + Google OAuth)    │
│                 │     │    ├─ PostgREST (REST API)            │
│                 │     │    └─ Realtime (WebSocket)            │
│                 │     │                                      │
│  Админ (:3001)  │────▶│  Studio (Supabase Dashboard)         │
│                 │     │    └─ pg-meta                         │
│                 │     │                                      │
│                 │     │  PostgreSQL (:5432)                   │
│                 │     │    └─ RLS-политики                    │
└─────────────────┘     └──────────────────────────────────────┘
```

**Стек:**

- **Frontend:** React Native (Expo SDK 54) + React 19 + expo-router
- **State:** Zustand
- **Backend:** Supabase (self-hosted)
- **DB:** PostgreSQL 15 с Row Level Security
- **Auth:** Google OAuth через GoTrue
- **Web-сервер:** nginx 1.27 с COOP/COEP headers

---

## Требования

| Компонент                | Минимум | Рекомендуется |
| ------------------------ | ------- | ------------- |
| Docker                   | 24.0+   | 27.0+         |
| Docker Compose           | v2.20+  | v2.30+        |
| RAM (VPS)                | 2 GB    | 4 GB          |
| Диск                     | 10 GB   | 20 GB         |
| Node.js (для разработки) | 20 LTS  | 22 LTS        |

---

## Быстрый старт (Docker)

### 1. Клонируй репозиторий

```bash
git clone <repo-url> habits
cd habits
```

### 2. Создай файл окружения

```bash
cp .env.example .env
```

### 3. Сгенерируй секреты и заполни `.env`

```bash
# JWT Secret
openssl rand -base64 32

# Postgres Password
# Важно: пароль попадает в postgres:// URL, поэтому используем URL-safe hex.
openssl rand -hex 24

# Secret Key Base (для Realtime)
openssl rand -base64 48

# Supabase API Keys (ANON_KEY и SERVICE_ROLE_KEY)
# → см. раздел "Генерация секретов"
```

### 4. Запусти

```bash
docker compose up -d --build
```

или через npm:

```bash
npm run docker:up
```

### 5. Проверь

```bash
# Статус контейнеров
docker compose ps

# Логи web-приложения
docker compose logs -f web

# Логи всех сервисов
docker compose logs -f
```

### 6. Примени прикладную схему

Схему приложения нужно применять после старта `supabase-auth`, потому что таблицы и функции `auth.*` создаёт GoTrue.

```bash
docker exec -i habbittracker-supabase-db-1 \
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  < supabase/migrations/001_initial_schema.sql

docker compose restart supabase-rest
```

### 7. Открой

| Сервис          | URL                   |
| --------------- | --------------------- |
| Приложение      | http://localhost:3000 |
| Supabase API    | http://localhost:8000 |
| Supabase Studio | http://localhost:3001 |

---

## Генерация секретов

### JWT_SECRET

```bash
openssl rand -base64 32
# Пример: K7x2bQ3rN5mP8kL1jH4wE6yT9uI0oA3sD5fG7hJ2kL=
```

### ANON_KEY и SERVICE_ROLE_KEY

Это JWT-токены, подписанные твоим `JWT_SECRET`. Сгенерируй их на:

**https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys**

Или вручную через jwt.io:

**ANON_KEY payload:**

```json
{
  "role": "anon",
  "iss": "supabase",
  "iat": 1735689600,
  "exp": 1893456000
}
```

**SERVICE_ROLE_KEY payload:**

```json
{
  "role": "service_role",
  "iss": "supabase",
  "iat": 1735689600,
  "exp": 1893456000
}
```

Подпиши оба payload алгоритмом **HS256** с твоим `JWT_SECRET`.

> **Важно:** `ANON_KEY` и `EXPO_PUBLIC_SUPABASE_ANON_KEY` — это одно и то же значение.

---

## Настройка Google OAuth

### 1. Создай проект в Google Cloud Console

1. Открой https://console.cloud.google.com/
2. Создай новый проект (или выбери существующий)
3. Перейди в **APIs & Services → Credentials**

### 2. Настрой OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. Тип: **External**
3. Заполни название приложения: `Трекер привычек`
4. Добавь scopes: `email`, `profile`, `openid`
5. Добавь test users (пока приложение не верифицировано)

### 3. Создай OAuth 2.0 Client ID

1. **Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Authorized redirect URIs:
   ```
   http://your-domain.com:8000/auth/v1/callback
   http://localhost:8000/auth/v1/callback
   ```
4. Скопируй **Client ID** и **Client Secret**

### 4. Для Android (дополнительно)

1. Создай ещё один OAuth Client ID, тип: **Android**
2. Package name: `com.anonymous.habits`
3. SHA-1 fingerprint:
   ```bash
   cd android && ./gradlew signingReport
   ```

### 5. Заполни в `.env`

```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
```

---

## Переменные окружения

### Полный список `.env`

| Переменная                      | Описание                                 | Пример                             |
| ------------------------------- | ---------------------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | URL API-шлюза Kong                       | `http://your-domain.com:8000`      |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Публичный ключ Supabase (= ANON_KEY)     | `eyJhbGc...`                       |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID`  | Google Client ID для native auth         | `123...apps.googleusercontent.com` |
| `WEB_PORT`                      | Порт web-приложения                      | `3000`                             |
| `KONG_HTTP_PORT`                | Порт API-шлюза                           | `8000`                             |
| `STUDIO_PORT`                   | Порт Supabase Studio                     | `3001`                             |
| `POSTGRES_PORT`                 | Порт PostgreSQL                          | `5432`                             |
| `POSTGRES_PASSWORD`             | Пароль PostgreSQL                        | сгенерированный                    |
| `JWT_SECRET`                    | Секрет для JWT-токенов (мин. 32 символа) | сгенерированный                    |
| `API_EXTERNAL_URL`              | Внешний URL Kong                         | `http://your-domain.com:8000`      |
| `SITE_URL`                      | URL приложения (для редиректов)          | `http://your-domain.com:3000`      |
| `ADDITIONAL_REDIRECT_URLS`      | Разрешённые callback URLs (JSON)         | `["habits://auth/callback"]`       |
| `ANON_KEY`                      | Supabase anon JWT                        | сгенерированный                    |
| `SERVICE_ROLE_KEY`              | Supabase service role JWT                | сгенерированный                    |
| `GOOGLE_CLIENT_ID`              | Google OAuth Client ID                   | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`          | Google OAuth Client Secret               | `GOCSPX-...`                       |
| `SECRET_KEY_BASE`               | Секрет для Realtime (мин. 64 символа)    | сгенерированный                    |

---

## Локальная разработка

### Без Docker (dev-сервер)

```bash
# Установи зависимости
npm install

# Создай .env в корне с EXPO_PUBLIC_* переменными

# Запусти dev-сервер
npm start

# Или сразу web
npm run web
# Откроется http://localhost:8081
```

### С Docker (production-like)

```bash
npm run docker:up
# Приложение на http://localhost:3000
```

### Полезные команды

```bash
npm start          # Expo dev-сервер (Metro Bundler)
npm run web        # Dev-сервер для web
npm run build:web  # Собрать статику в dist/
npm run android    # Запуск на Android-устройстве/эмуляторе

npm run docker:up    # Собрать и запустить всё
npm run docker:down  # Остановить всё
npm run docker:logs  # Логи web-контейнера
npm run docker:build # Только собрать образ
```

---

## Деплой на VPS

### 1. Подготовь VPS

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Перелогинься
```

### 2. Клонируй и настрой

```bash
git clone <repo-url> /opt/habits
cd /opt/habits
cp .env.example .env
nano .env  # Заполни все значения
```

### 3. Замени `your-domain.com` на реальный IP/домен

В `.env` обнови:

```env
EXPO_PUBLIC_SUPABASE_URL=http://203.0.113.10:8000
API_EXTERNAL_URL=http://203.0.113.10:8000
SITE_URL=http://203.0.113.10:3000
```

### 4. Запусти

```bash
docker compose up -d --build
```

### 5. Проверь доступность

```bash
curl http://localhost:3000          # Web-приложение
curl http://localhost:8000/rest/v1/ # Supabase API
docker compose ps                  # Все сервисы running
```

### 6. (Опционально) Nginx reverse proxy + SSL

Если нужен HTTPS с Let's Encrypt, поставь nginx на хост:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/habits`:

```nginx
server {
    server_name habits.your-domain.com;

    # Web-приложение
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Supabase API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/habits /etc/nginx/sites-enabled/
sudo certbot --nginx -d habits.your-domain.com
sudo systemctl reload nginx
```

После этого обнови `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://habits.your-domain.com/api
API_EXTERNAL_URL=https://habits.your-domain.com/api
SITE_URL=https://habits.your-domain.com
```

И пересобери:

```bash
docker compose up -d --build
```

---

## Android-сборка

### Development build

```bash
# На машине с Android SDK
npm run android
```

### Production APK (через EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```

### Важно для Android

- В `app.json` → `android.package`: `com.anonymous.habits` — замени на реальный package
- Создай отдельный Google OAuth Client ID типа Android с SHA-1 fingerprint
- Deep link scheme: `habits://` (настроен в `app.json` → `scheme`)

---

## Структура проекта

```
habits/
├── app/                          # Expo Router — экраны
│   ├── (tabs)/                   # Табы: привычки, календарь, статистика
│   │   ├── index.tsx             # Главный экран (список привычек)
│   │   ├── calendar.tsx          # Календарь с фильтрами
│   │   └── stats.tsx             # Статистика привычек
│   ├── habits/
│   │   ├── new.tsx               # Создание привычки
│   │   └── [id].tsx              # Детали привычки
│   ├── login.tsx                 # Экран входа (Google OAuth)
│   └── _layout.tsx               # Root layout + auth guard
├── components/
│   ├── DatePickerModal.tsx       # Кастомный дата-пикер
│   └── Themed.tsx                # Тематические компоненты
├── constants/
│   └── theme.ts                  # Цвета, отступы, размеры шрифтов
├── src/
│   ├── auth/
│   │   └── AuthContext.tsx       # React Context для Google Auth
│   ├── domain/
│   │   ├── habits.ts             # Zod-схемы и типы данных
│   │   └── schedule.ts           # Логика расписаний
│   ├── lib/
│   │   ├── date/
│   │   │   └── localDay.ts      # Утилиты для дат
│   │   ├── db/
│   │   │   ├── database.ts      # SQLite (legacy, для fallback)
│   │   │   └── schema.ts        # SQLite-схема
│   │   └── supabase/
│   │       ├── client.ts         # Supabase-клиент с SecureStore
│   │       ├── types.ts          # Типы Database для всех таблиц
│   │       └── queries.ts        # Общие запросы
│   └── store/
│       ├── habitsStore.ts        # Re-export (переключатель)
│       └── habitsStore.supabase.ts  # Zustand-стор через Supabase
├── supabase/
│   ├── migrations/
│   │   ├── 999_platform_finalize.sh # Bootstrap ролей/служебных схем Supabase
│   │   └── 001_initial_schema.sql  # Полная PostgreSQL-схема + RLS
│   ├── docker-compose.yml          # Standalone Supabase compose
│   ├── kong.yml                    # API gateway конфиг
│   └── .env.example                # Переменные для standalone
├── docker-compose.yml            # Полный стек (web + supabase)
├── Dockerfile                    # Multi-stage: node → nginx
├── nginx.conf                    # SPA + COOP/COEP + gzip
├── .env.example                  # Все переменные
├── .dockerignore
├── app.json                      # Expo конфигурация
├── metro.config.js               # Metro + COOP/COEP dev headers
├── package.json
└── tsconfig.json
```

---

## Управление и обслуживание

### Обновление приложения

```bash
cd /opt/habits
git pull
docker compose up -d --build web  # Пересобрать только web
```

### Бэкап базы данных

```bash
# Дамп
docker compose exec supabase-db pg_dump -U supabase_admin postgres > backup_$(date +%F).sql

# Восстановление
cat backup.sql | docker compose exec -T supabase-db psql -U supabase_admin postgres
```

### Просмотр логов

```bash
docker compose logs -f              # Все сервисы
docker compose logs -f web           # Только web
docker compose logs -f supabase-auth # Только auth
docker compose logs -f supabase-db   # Только PostgreSQL
```

### Перезапуск отдельных сервисов

```bash
docker compose restart web
docker compose restart supabase-auth
```

### Полная остановка

```bash
docker compose down          # Остановить (данные сохранятся в volume)
docker compose down -v       # Остановить + удалить данные (!осторожно!)
```

### Масштабирование (по необходимости)

```bash
docker compose up -d --scale supabase-rest=2  # 2 инстанса PostgREST
```

---

## Порты

| Порт | Сервис            | Описание                                       |
| ---- | ----------------- | ---------------------------------------------- |
| 3000 | `web`             | Веб-приложение (nginx + Expo static)           |
| 8000 | `supabase-kong`   | Supabase API Gateway                           |
| 3001 | `supabase-studio` | Admin Dashboard                                |
| 5432 | `supabase-db`     | PostgreSQL (только для отладки, можно закрыть) |

На VPS рекомендуется открыть в firewall только **3000** и **8000** (и 443 при HTTPS).

---

## Траблшутинг

### Контейнеры не стартуют

```bash
docker compose logs          # Смотри ошибки
docker compose ps            # Проверь статусы
```

### `supabase-db` не запускается

- Проверь `POSTGRES_PASSWORD` — не должен содержать спецсимволы `@`, `$`, `\`
- Если volume повреждён: `docker compose down -v && docker compose up -d`

### Web-приложение не загружается

```bash
# Проверь что nginx запущен
docker compose exec web nginx -t

# Проверь что статика есть
docker compose exec web ls /usr/share/nginx/html/
```

### Google OAuth не работает

1. Проверь `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` совпадает с URI в Google Console
2. Redirect URI формат: `http://your-domain:8000/auth/v1/callback`
3. Проверь логи auth: `docker compose logs supabase-auth`

### Ошибка CORS

Убедись что `ADDITIONAL_REDIRECT_URLS` содержит URL твоего приложения:

```env
ADDITIONAL_REDIRECT_URLS=["habits://auth/callback","http://your-domain:3000"]
```

### SQLite ошибки в браузере (SharedArrayBuffer)

Nginx автоматически выставляет заголовки `Cross-Origin-Opener-Policy` и `Cross-Origin-Embedder-Policy`. Если используешь внешний reverse proxy, убедись что он не удаляет эти заголовки.

### Пересборка после изменения .env

Переменные `EXPO_PUBLIC_*` вшиваются в статику при сборке. После их изменения нужно пересобрать:

```bash
docker compose up -d --build web
```

Переменные Supabase-сервисов (POSTGRES_PASSWORD, JWT_SECRET и т.д.) подхватываются автоматически при перезапуске.
