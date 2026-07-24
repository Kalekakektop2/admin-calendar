-- Таблица конфигурации бонусов
CREATE TABLE bonus_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bonus_percentage DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
    base_bonus_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    min_revenue_for_bonus DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_bonus_amount DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Вставка начальной конфигурации бонусов
INSERT INTO bonus_config (bonus_percentage, base_bonus_amount, min_revenue_for_bonus, max_bonus_amount)
VALUES (5.00, 0.00, 0.00, NULL);

-- RLS для bonus_config
ALTER TABLE bonus_config ENABLE ROW LEVEL SECURITY;

-- Только руководители могут читать конфигурацию бонусов
CREATE POLICY "Managers can view bonus config" ON bonus_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Только руководители могут обновлять конфигурацию бонусов
CREATE POLICY "Managers can update bonus config" ON bonus_config
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Триггер для обновления updated_at
CREATE TRIGGER update_bonus_config_updated_at BEFORE UPDATE ON bonus_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
