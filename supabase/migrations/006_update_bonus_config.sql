-- Обновить конфигурацию бонусов до 15%
UPDATE bonus_config 
SET bonus_percentage = 15.00,
    updated_at = TIMEZONE('utc', NOW())
WHERE is_active = true;
