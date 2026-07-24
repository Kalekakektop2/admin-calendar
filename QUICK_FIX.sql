-- Быстрое исправление для проблемы с bonus_amount
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Шаг 1: Убираем NOT NULL ограничение
ALTER TABLE shifts ALTER COLUMN bonus_amount DROP NOT NULL;

-- Шаг 2: Добавляем значение по умолчанию
ALTER TABLE shifts ALTER COLUMN bonus_amount SET DEFAULT 0.00;

-- Шаг 3: Обновляем существующие NULL значения (если есть)
UPDATE shifts SET bonus_amount = 0.00 WHERE bonus_amount IS NULL;
