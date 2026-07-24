-- Удалить все смены из таблицы shifts
DELETE FROM shifts;

-- Если нужно также удалить связанные фотографии, используйте:
-- DELETE FROM shift_photos WHERE shift_id IN (SELECT id FROM shifts);
-- DELETE FROM shifts;
