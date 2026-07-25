-- Отключить триггер автоматического расчета бонуса
-- Это позволит использовать клиентский расчет премии (15% от выручки)
DROP TRIGGER IF EXISTS trigger_auto_calculate_bonus ON shifts;

-- Если нужно снова включить триггер, выполните:
-- CREATE TRIGGER trigger_auto_calculate_bonus
--     BEFORE INSERT OR UPDATE ON shifts
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_calculate_shift_bonus();
