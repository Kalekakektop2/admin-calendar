# Применение миграций к базе данных

Для применения новых изменений к базе данных необходимо выполнить следующие SQL-запросы в Supabase Dashboard → SQL Editor:

## 1. Добавление поля shift_type

```sql
-- Создаем перечисление для типов смен
CREATE TYPE shift_type AS ENUM ('day', 'night');

-- Добавляем поле в таблицу shifts
ALTER TABLE shifts 
ADD COLUMN shift_type shift_type DEFAULT 'day' NOT NULL;

-- Обновляем существующие записи
UPDATE shifts SET shift_type = 'day' WHERE shift_type IS NULL;
```

## 2. Исправление политик для фотографий

```sql
-- Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view photos of own shifts" ON shift_photos;
DROP POLICY IF EXISTS "Users can upload photos to own shifts" ON shift_photos;
DROP POLICY IF EXISTS "Managers can view all photos" ON shift_photos;
DROP POLICY IF EXISTS "Managers can delete any photos" ON shift_photos;
DROP POLICY IF EXISTS "Admins can delete own photos" ON shift_photos;

-- Создаем новые более простые политики

-- Администраторы могут видеть все фото (через связь с shifts)
CREATE POLICY "Admins can view photos" ON shift_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Руководители могут видеть все фото
CREATE POLICY "Managers can view all photos" ON shift_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Администраторы могут загружать фото для своих смен
CREATE POLICY "Admins can upload photos" ON shift_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Администраторы могут удалять свои фото
CREATE POLICY "Admins can delete own photos" ON shift_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Руководители могут удалять любые фото
CREATE POLICY "Managers can delete any photos" ON shift_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );
```

## 3. Добавление поля username для логинов

```sql
-- Добавляем поле username в таблицу users
ALTER TABLE users 
ADD COLUMN username TEXT UNIQUE;

-- Создаем индекс для быстрого поиска по username
CREATE INDEX idx_users_username ON users(username);

-- Обновляем существующих пользователей (генерируем username из email до @)
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;
```

## 4. Увеличение лимитов для числовых полей

```sql
-- Увеличиваем лимиты для числовых полей для избежания overflow
-- DECIMAL(20, 2) позволяет хранить до 999,999,999,999,999,999.99

-- Увеличиваем лимит для total_revenue
ALTER TABLE shifts 
ALTER COLUMN total_revenue TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для cash_balance
ALTER TABLE shifts 
ALTER COLUMN cash_balance TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для card_revenue
ALTER TABLE shifts 
ALTER COLUMN card_revenue TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для bonus_amount
ALTER TABLE shifts 
ALTER COLUMN bonus_amount TYPE DECIMAL(20, 2);
```

## 5. Обновление расчета бонуса: 5% от наличных

```sql
-- Обновляем bonus_amount для всех существующих смен
UPDATE shifts 
SET bonus_amount = ROUND(cash_balance * 0.05, 2)
WHERE bonus_amount IS NULL OR bonus_amount = 0;
```

## Порядок выполнения:

1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните SQL из раздела 1 (shift_type)
4. Выполните SQL из раздела 2 (политики фотографий)
5. Выполните SQL из раздела 3 (username)
6. Выполните SQL из раздела 4 (увеличение лимитов числовых полей)
7. Выполните SQL из раздела 5 (обновление расчета бонуса)
8. Проверьте, что изменения применены корректно

## После применения миграций:

1. Обновите страницу приложения
2. Проверьте, что форма администратора работает с новым полем "Тип смены"
3. Проверьте, что календарь руководителя показывает полные имена администраторов
4. Проверьте, что страница создания администраторов работает с новым полем "Логин"
5. Проверьте, что вход по логину работает корректно
6. Проверьте, что фотографии загружаются у руководителя

## Примечание:

- Email для авторизации используется технический (dummy@domain.com), пользователи авторизуются по логину
- Логин должен быть уникальным для каждого администратора
