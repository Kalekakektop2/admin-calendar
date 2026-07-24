-- Исправление для поля bonus_amount - убираем NOT NULL ограничение
-- Это позволит триггеру автоматически рассчитывать бонус после вставки

-- Меняем поле на nullable
ALTER TABLE shifts ALTER COLUMN bonus_amount DROP NOT NULL;

-- Добавляем значение по умолчанию 0.00
ALTER TABLE shifts ALTER COLUMN bonus_amount SET DEFAULT 0.00;
