-- Обновление расчета бонуса: 5% от наличных за смену
-- Обновляем существующие записи в базе данных

-- Обновляем bonus_amount для всех существующих смен
UPDATE shifts 
SET bonus_amount = ROUND(cash_balance * 0.05, 2)
WHERE bonus_amount IS NULL OR bonus_amount = 0;
