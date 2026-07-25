# Админский календарь

Система внутренней отчётности и управления для компьютерного клуба.  
Роли: **Администратор** (`admin`) и **Руководитель** (`manager`).

**Репозиторий:** [github.com/Kalekakektop2/admin-calendar](https://github.com/Kalekakektop2/admin-calendar)  
**Деплой:** Vercel (автоматически при `push` в `main`)

---

## Технологический стек

| Слой | Технологии |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend / Auth / DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| UI | Lucide React |
| Даты | date-fns (+ локаль `ru`) |

---

## Возможности

### Панель руководителя (`/manager`)

| Раздел | URL | Описание |
|--------|-----|----------|
| Все смены за месяц | `/manager` | Статистика + таблица закрытых отчётов за месяц (без календаря) |
| Календарь смен | `/manager/shift-calendar` | Выставление смен админам (день/ночь), цвета админов, режим редактирования |
| Закрытые смены | `/manager/closed-shifts` | Только смены, которые были **запланированы** и **закрыты** админом; фильтр по администратору |
| Месячные отчёты | `/manager/monthly-reports` | Сводка по месяцу |
| Зарплаты | `/manager/admin-salary` | Расчёт зарплат администраторов |
| Штрафы | `/manager/fines` | Управление штрафами |
| Создать / удалить админа | `/manager/create-admin`, `/manager/delete-admin` | Управление пользователями |

### Панель администратора (`/admin`)

| Раздел | URL | Описание |
|--------|-----|----------|
| Главная | `/admin` | Закрытие смены, статистика, штрафы, история своих закрытых смен |
| Мои смены | `/admin/my-shifts` | **Расписание** от руководителя (`planned_shifts`), календарь; фильтр «только свои / все админы» |

### Закрытие смены (правила)

1. Закрыть смену можно **только если** руководитель выставил её в «Календаре смен».
2. **Дата и тип (день/ночь)** определяются автоматически по текущему времени:
   - **09:00–21:00** → День, дата = сегодня  
   - **21:00–00:00** → Ночь, дата = сегодня (день **начала** ночи)  
   - **00:00–09:00** → Ночь, дата = вчера  
3. **Обед (`meal_allowance`)** всегда **100 ₽**, поле у админа скрыто.
4. Обязательна **фотофиксация** (минимум 1 фото).
5. Сохраняются: выручка, наличные, инкассация, **аванс**, примечания, премия.
6. Рейтинг **«Топ»** — место админа среди всех по **общей выручке** (RPC `get_admin_revenue_ranks`).

### Премия (клиентский расчёт по выручке)

| Выручка (₽) | Премия (₽) |
|-------------|------------|
| 8 000 – 9 999 | 300 |
| 10 000 – 11 999 | 500 |
| 12 000 – 13 999 | 700 |
| 14 000 – 17 999 | … (см. код `calculateBonus` в `src/app/admin/page.tsx`) |

*(В БД также есть `bonus_config` и триггеры — при расхождении сверяйте клиентский расчёт и триггеры.)*

---

## Быстрый старт

### 1. Клонирование и зависимости

```bash
git clone https://github.com/Kalekakektop2/admin-calendar.git
cd admin-calendar
npm install
```

### 2. Переменные окружения

Скопируйте `env.example` → `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Значения: Supabase → **Project Settings → API**.

### 3. Миграции БД

Выполните SQL-файлы из `supabase/migrations/` **по порядку** в Supabase SQL Editor:

| Файл | Назначение |
|------|------------|
| `001_initial_schema.sql` | users, shifts, shift_photos, RLS |
| `002_bonus_config.sql` | Конфиг бонусов |
| `003_bonus_calculation_function.sql` | Функции/триггеры бонусов |
| `004_fines.sql` | Штрафы |
| `004_fix_bonus_amount_nullable.sql` | nullable bonus |
| `005_encashment.sql` | Инкассация |
| `005_remove_revenue_constraint.sql` | Снятие ограничений выручки |
| `006_add_shift_type.sql` | Тип смены day/night |
| `006_update_bonus_config.sql` | Обновление конфига бонусов |
| `007_advances.sql` | Таблица advances |
| `007_fix_photo_policies.sql` | Политики Storage/фото |
| `008_add_username.sql` | username у users |
| `008_advance_field.sql` | Поле `advance` в shifts |
| `009_increase_decimal_limits.sql` | Увеличение DECIMAL |
| `009_meal_allowance.sql` | Обед |
| `010_update_bonus_calculation.sql` | Пересчёт бонусов |
| `011_planned_shifts_and_user_color.sql` | **`planned_shifts` + `users.color`** |
| `012_planned_shifts_admin_read_all.sql` | Админы видят все planned_shifts и профили |
| `013_admin_revenue_rank.sql` | Функция **Топ** по выручке |
| `014_planned_shifts_google_source.sql` | Google-синк: `source`, `manual_override`, `planned_shift_blocks` |

### Google Sheets (расписание)

1. Создайте таблицу с колонками: **дата | админ | тип** (`день` / `ночь`).
2. Доступ: **Все, у кого есть ссылка → Читатель**.
3. В `.env.local` / Vercel:
   - `GOOGLE_SCHEDULE_SHEET_ID=...` и опционально `GOOGLE_SCHEDULE_SHEET_GID=0`
   - или `GOOGLE_SCHEDULE_CSV_URL=https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0`
4. В «Календарь смен» нажмите **«Синк с Google»**.
5. **Ручные правки руководителя** (`source=manual` / `manual_override`) **не перезаписываются** Google.
6. Если руководитель **удалил** смену — слот блокируется (`planned_shift_blocks`), Google не вернёт её, пока руководитель не поставит снова.

Затем выполните `supabase/storage_setup.sql` (bucket `shift-photos`).

### 4. Пользователи

1. Создайте пользователя в **Supabase Auth → Users**.
2. Добавьте запись в `users` с **тем же UUID**:

```sql
INSERT INTO users (id, email, full_name, username, role, color)
VALUES (
  'auth-user-id',
  'admin@example.com',
  'Имя Фамилия',
  'admin_login',
  'admin',          -- или 'manager'
  '#3b82f6'
);
```

### 5. Запуск

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
npm run lint
```

### 6. Деплой (Vercel + GitHub)

```bash
git add .
git commit -m "описание изменений"
git push origin main
```

Vercel подхватывает `main` автоматически.  
Переменные `NEXT_PUBLIC_SUPABASE_*` должны быть заданы в настройках проекта Vercel.

---

## Структура проекта

```
admin-calendar/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── page.tsx              # Главная админа (закрытие смены, статистика, штрафы)
│   │   │   ├── my-shifts/page.tsx    # Расписание (planned_shifts)
│   │   │   └── layout.tsx
│   │   ├── manager/
│   │   │   ├── page.tsx              # Все смены за месяц
│   │   │   ├── shift-calendar/       # Выставление смен
│   │   │   ├── closed-shifts/        # Закрытые + фильтр админов
│   │   │   ├── monthly-reports/
│   │   │   ├── admin-salary/
│   │   │   ├── fines/
│   │   │   ├── create-admin/
│   │   │   ├── delete-admin/
│   │   │   └── layout.tsx
│   │   ├── login/ | logout/ | unauthorized/
│   │   ├── layout.tsx | page.tsx | globals.css
│   ├── components/
│   │   ├── providers/                # Supabase, тема
│   │   └── ui/                       # card, modal, stat-card, file-upload, theme-toggle
│   ├── lib/
│   │   ├── auth.ts                   # requireRole, getUserRole, …
│   │   ├── supabase/                 # client + server
│   │   └── utils.ts
│   ├── middleware.ts                 # Защита /admin, /manager
│   └── types/database.ts             # Типы схемы
├── supabase/
│   ├── migrations/                   # 001–013
│   └── storage_setup.sql
├── env.example
├── package.json
└── README.md
```

---

## Схема базы данных (основные таблицы)

### `users`
| Поле | Описание |
|------|----------|
| `id` | UUID = Auth user id |
| `email`, `full_name`, `username` | Профиль |
| `role` | `admin` \| `manager` |
| `color` | HEX-цвет в календаре (у каждого админа свой) |

### `planned_shifts` (расписание)
| Поле | Описание |
|------|----------|
| `user_id` | Админ |
| `shift_date` | Дата смены |
| `shift_type` | `day` \| `night` |
| UNIQUE | `(user_id, shift_date, shift_type)` |

### `shifts` (закрытые отчёты)
| Поле | Описание |
|------|----------|
| `user_id`, `shift_date`, `shift_type` | Кто, когда, день/ночь |
| `total_revenue`, `cash_balance`, `card_revenue` | Финансы |
| `bonus_amount` | Премия |
| `encashment` | Инкассация |
| `advance` | Аванс |
| `meal_allowance` | Обед (фиксированно 100) |
| `notes` | Примечания |

### `shift_photos`
Фото к смене (Storage bucket `shift-photos`).

### `fines`
Штрафы: `user_id`, `amount`, `fine_date`, `comment`.

### `advances` (отдельная таблица)
Авансы, выдаваемые руководителем (историческая/доп. сущность; в отчёте смены используется поле `shifts.advance`).

### `bonus_config`
Настройки расчёта бонуса на стороне БД.

### RPC
- `get_admin_revenue_ranks()` — рейтинг админов по сумме `total_revenue` (для блока **Топ**).

---

## Безопасность (RLS)

- Таблицы с **Row Level Security**.
- Руководитель: полный доступ к сменам, планам, штрафам, пользователям.
- Администратор:
  - свои закрытые смены (create/update/select own);
  - просмотр **всех** `planned_shifts` (расписание коллег) — миграция `012`;
  - просмотр профилей коллег (имена/цвета);
  - рейтинг через SECURITY DEFINER-функцию `013`.
- Маршруты `/admin` и `/manager` защищены `middleware` + проверкой роли в layout.

---

## Типовые SQL-операции

### Удалить все закрытые смены и фото

```sql
DELETE FROM shift_photos;
DELETE FROM shifts;
```

### Удалить ещё и расписание

```sql
DELETE FROM shift_photos;
DELETE FROM shifts;
DELETE FROM planned_shifts;
```

### Проверка

```sql
SELECT COUNT(*) FROM shifts;
SELECT COUNT(*) FROM planned_shifts;
```

---

## Разработка и Git

```bash
npm run dev
npm run build
npm run lint

git add .
git commit -m "feat: ..."
git push origin main   # → Vercel deploy
```

**Не коммитить** `.env.local` и секреты.

Изменения схемы — **только новыми миграциями** в `supabase/migrations/`, с обновлением `src/types/database.ts` при необходимости.

---

## Устранение неполадок

| Проблема | Что проверить |
|----------|----------------|
| Не логинится | `.env.local` / env на Vercel, Auth user + запись в `users` |
| «Нет запланированной смены» | Есть ли запись в `planned_shifts` на дату/тип; миграция `011` |
| «Мои смены» пустые у коллег | Миграция `012` (RLS SELECT) |
| Топ показывает «—» | Миграция `013`, функция `get_admin_revenue_ranks` |
| Аванс всегда 0 | Колонка `advance` (`008_advance_field.sql`); повторно закрыть смену после фикса |
| Фото не грузятся | `storage_setup.sql`, bucket `shift-photos`, политики Storage |
| Ошибка policy already exists | В SQL: `DROP POLICY IF EXISTS "..." ON table;` перед `CREATE POLICY` |

---

## Лицензия

Внутреннее использование компьютерным клубом.  
Обратная связь и предложения по улучшению приветствуются.
