-- Добавляем поле advance в таблицу shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS advance DECIMAL(10, 2) DEFAULT 0;
