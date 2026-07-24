-- Добавление поля shift_type для типа смены (день/ночь)
-- Создаем перечисление для типов смен
CREATE TYPE shift_type AS ENUM ('day', 'night');

-- Добавляем поле в таблицу shifts
ALTER TABLE shifts 
ADD COLUMN shift_type shift_type DEFAULT 'day' NOT NULL;

-- Обновляем существующие записи
UPDATE shifts SET shift_type = 'day' WHERE shift_type IS NULL;
