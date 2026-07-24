-- Добавляем поле encashment в таблицу shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS encashment DECIMAL(10, 2) DEFAULT 0;
