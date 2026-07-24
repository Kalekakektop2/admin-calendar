-- Быстрое исправление для ограничения valid_revenue
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Удаляем ограничение проверки выручки
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS valid_revenue;
