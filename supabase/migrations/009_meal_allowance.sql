-- Добавляем поле meal_allowance в таблицу shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS meal_allowance DECIMAL(10, 2) DEFAULT 100;
