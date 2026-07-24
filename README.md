# Админский календарь

Система внутренней отчетности и управления для компьютерного клуба с разделением на роли Администратора и Руководителя.

## Технологический стек

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **UI**: Lucide React icons
- **Date handling**: date-fns

## Возможности

### Для Администраторов:
- Форма отчета за смену с ключевыми показателями
- Обязательная фотофиксация рабочего места
- Авторасчет премий на основе выручки
- История отправленных смен

### Для Руководителей:
- Интерактивный календарь для просмотра отчетов
- Финансовая сводка с метриками за период
- Аудит загруженных фотографий
- Детальный просмотр смен и фотофиксации

## Установка и настройка

### 1. Клонирование и установка зависимостей

```bash
cd admin-calendar
npm install
```

### 2. Настройка Supabase

#### Создание проекта:
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения инициализации

#### Получение учетных данных:
1. В настройках проекта (Project Settings > API)
2. Скопируйте `Project URL` и `anon public key`

#### Применение миграций базы данных:

Файлы миграций находятся в папке `supabase/migrations/`:

1. `001_initial_schema.sql` - Основная схема базы данных
2. `002_bonus_config.sql` - Конфигурация системы бонусов
3. `003_bonus_calculation_function.sql` - Функции автоматического расчета бонусов

Выполните их в Supabase SQL Editor в порядке нумерации.

#### Настройка Storage:

Выполните SQL из файла `supabase/storage_setup.sql` в Supabase SQL Editor для создания bucket для фотографий.

### 3. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Используйте значения из настроек вашего Supabase проекта.

### 4. Создание тестовых пользователей

После применения миграций будет создан тестовый пользователь-руководитель:
- Email: `manager@example.com`
- Роль: `manager`

Для создания администраторов выполните в Supabase SQL Editor:

```sql
-- Создание пользователя в Supabase Auth
-- (сделайте это через UI Supabase: Authentication > Users)

-- После создания пользователя добавьте запись в таблицу users:
INSERT INTO users (id, email, full_name, role)
VALUES ('user-id-from-auth', 'admin@example.com', 'Имя Администратора', 'admin');
```

Важно: ID пользователя должен совпадать с ID в Supabase Auth.

### 5. Запуск проекта

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Структура проекта

```
admin-calendar/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/               # Интерфейс администратора
│   │   ├── manager/             # Интерфейс руководителя
│   │   ├── login/               # Страница входа
│   │   ├── logout/              # Страница выхода
│   │   └── unauthorized/         # Страница доступа запрещен
│   ├── components/
│   │   └── providers/           # React провайдеры
│   ├── lib/
│   │   ├── supabase/            # Supabase клиенты
│   │   └── auth.ts              # Функции авторизации
│   └── types/
│       └── database.ts          # TypeScript типы для БД
├── supabase/
│   ├── migrations/              # SQL миграции
│   └── storage_setup.sql        # Настройка Storage
└── env.example                  # Пример переменных окружения
```

## Схема базы данных

### Таблица `users`
- `id` - UUID (primary key)
- `email` - уникальный email
- `full_name` - полное имя
- `role` - роль пользователя ('admin' или 'manager')
- `created_at`, `updated_at` - временные метки

### Таблица `shifts`
- `id` - UUID (primary key)
- `user_id` - ссылка на пользователя
- `shift_date` - дата смены
- `total_revenue` - общая выручка
- `cash_balance` - наличные в кассе
- `card_revenue` - безналичный расчет
- `bonus_amount` - рассчитанный бонус
- `notes` - примечания
- `created_at`, `updated_at` - временные метки

### Таблица `shift_photos`
- `id` - UUID (primary key)
- `shift_id` - ссылка на смену
- `photo_url` - публичный URL фото
- `photo_path` - путь в Storage
- `description` - описание фото
- `uploaded_at` - время загрузки

### Таблица `bonus_config`
- `id` - UUID (primary key)
- `bonus_percentage` - процент от выручки для бонуса
- `base_bonus_amount` - базовая сумма бонуса
- `min_revenue_for_bonus` - минимальная выручка для бонуса
- `max_bonus_amount` - максимальный бонус (опционально)
- `is_active` - активна ли конфигурация

## Безопасность

### Row Level Security (RLS)

Все таблицы защищены RLS политиками:

- **Администраторы** могут видеть и редактировать только свои смены
- **Руководители** имеют полный доступ ко всем данным
- **Фотографии** доступны только автору смены и руководителям

### Auth

- Используется Supabase Auth для аутентификации
- Middleware защищает маршруты по ролям
- Перенаправление на страницу входа для неавторизованных

## Формула расчета бонуса

Бонус рассчитывается автоматически при создании смены:

```
Бонус = base_bonus_amount + (total_revenue * bonus_percentage / 100)
```

Ограничения:
- Если `total_revenue < min_revenue_for_bonus`, бонус = 0
- Если задан `max_bonus_amount`, бонус ограничивается этим значением

По умолчанию:
- `bonus_percentage`: 5%
- `base_bonus_amount`: 0 ₽
- `min_revenue_for_bonus`: 0 ₽
- `max_bonus_amount`: не ограничен

## Разработка

### Запуск в режиме разработки

```bash
npm run dev
```

### Сборка для продакшена

```bash
npm run build
npm start
```

### Линтинг

```bash
npm run lint
```

## Дополнительная настройка

### Изменение формулы бонуса

Обновите конфигурацию в таблице `bonus_config` через Supabase SQL Editor:

```sql
UPDATE bonus_config
SET bonus_percentage = 7.00,
    base_bonus_amount = 500.00,
    min_revenue_for_bonus = 10000.00,
    max_bonus_amount = 5000.00
WHERE is_active = true;
```

### Добавление новых пользователей

1. Создайте пользователя в Supabase Auth (UI)
2. Добавьте запись в таблицу `users`:

```sql
INSERT INTO users (id, email, full_name, role)
VALUES ('auth-user-id', 'email@example.com', 'Полное Имя', 'admin');
```

## Поддержка

При возникновении проблем:

1. Проверьте настройки Supabase в `.env.local`
2. Убедитесь, что миграции применены корректно
3. Проверьте консоль браузера на наличие ошибок
4. Проверьте логи Supabase в Dashboard

## Лицензия

Проект создан для внутреннего использования компьютерным клубом.
