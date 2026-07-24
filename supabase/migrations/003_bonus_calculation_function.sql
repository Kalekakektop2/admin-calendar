-- Функция для расчета бонуса на основе выручки
CREATE OR REPLACE FUNCTION calculate_shift_bonus(
    p_total_revenue DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_bonus_percentage DECIMAL(5, 2);
    v_base_bonus_amount DECIMAL(10, 2);
    v_min_revenue_for_bonus DECIMAL(10, 2);
    v_max_bonus_amount DECIMAL(10, 2);
    v_calculated_bonus DECIMAL(10, 2);
BEGIN
    -- Получение активной конфигурации бонусов
    SELECT 
        bonus_percentage, 
        base_bonus_amount, 
        min_revenue_for_bonus, 
        max_bonus_amount
    INTO 
        v_bonus_percentage, 
        v_base_bonus_amount, 
        v_min_revenue_for_bonus, 
        v_max_bonus_amount
    FROM bonus_config
    WHERE is_active = true
    LIMIT 1;

    -- Если выручка ниже минимальной, бонус не начисляется
    IF p_total_revenue < v_min_revenue_for_bonus THEN
        RETURN 0.00;
    END IF;

    -- Расчет бонуса: базовый + процент от выручки
    v_calculated_bonus := v_base_bonus_amount + (p_total_revenue * v_bonus_percentage / 100);

    -- Применение максимального ограничения если задано
    IF v_max_bonus_amount IS NOT NULL AND v_calculated_bonus > v_max_bonus_amount THEN
        v_calculated_bonus := v_max_bonus_amount;
    END IF;

    RETURN v_calculated_bonus;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического расчета бонуса при создании/обновлении смены
CREATE OR REPLACE FUNCTION auto_calculate_shift_bonus()
RETURNS TRIGGER AS $$
BEGIN
    -- Автоматический расчет бонуса на основе общей выручки
    NEW.bonus_amount := calculate_shift_bonus(NEW.total_revenue);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение триггера к таблице shifts
CREATE TRIGGER trigger_auto_calculate_bonus
    BEFORE INSERT OR UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_shift_bonus();
