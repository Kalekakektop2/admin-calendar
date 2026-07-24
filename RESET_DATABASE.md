# Сброс и пересоздание базы данных

Если миграции не применяются корректно, может потребоваться сброс базы данных.

## Вариант 1: Сброс через Supabase Dashboard

### 1. Удалите существующие таблицы
В Supabase Dashboard → SQL Editor выполните:

```sql
-- Удаление таблиц в правильном порядке (сначала зависимые)
DROP TABLE IF EXISTS shift_photos CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS bonus_config CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Удаление функции
DROP FUNCTION IF EXISTS calculate_shift_bonus CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_shift_bonus CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

### 2. Примените исправленные миграции

Выполните миграции по порядку:
1. `supabase/migrations/001_initial_schema.sql` (исправленная версия)
2. `supabase/migrations/002_bonus_config.sql`
3. `supabase/migrations/003_bonus_calculation_function.sql`

### 3. Настройте Storage
Выполните `supabase/storage_setup.sql`

## Вариант 2: Полный сброс проекта (если возможно)

Если у вас тестовый проект, проще создать новый проект в Supabase и применить миграции с нуля.

## Вариант 3: Быстрое исправление без сброса

Если вы не хотите сбрасывать базу данных, выполните этот SQL в Supabase SQL Editor:

```sql
-- Проверяем текущую структуру таблицы
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shifts' 
AND column_name = 'bonus_amount';

-- Если показывает NOT NULL без default, выполняем:
ALTER TABLE shifts ALTER COLUMN bonus_amount DROP NOT NULL;
ALTER TABLE shifts ALTER COLUMN bonus_amount SET DEFAULT 0.00;
UPDATE shifts SET bonus_amount = 0.00 WHERE bonus_amount IS NULL;
```

## После исправления

1. Обновите страницу приложения
2. Попробуйте создать смену снова
3. Проверьте консоль браузера на наличие логов (теперь они более детальные)
