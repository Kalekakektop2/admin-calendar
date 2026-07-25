-- Добавление цвета пользователя (для визуального разделения в календаре)
ALTER TABLE users ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Таблица запланированных смен (выставляет руководитель)
CREATE TABLE IF NOT EXISTS planned_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_type shift_type NOT NULL DEFAULT 'day',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, shift_date, shift_type)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_planned_shifts_user_id ON planned_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_shifts_date ON planned_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_planned_shifts_date_type ON planned_shifts(shift_date, shift_type);

-- Триггер updated_at
CREATE TRIGGER update_planned_shifts_updated_at BEFORE UPDATE ON planned_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE planned_shifts ENABLE ROW LEVEL SECURITY;

-- Политики RLS для planned_shifts
-- Руководители могут видеть все запланированные смены
CREATE POLICY "Managers can view all planned_shifts" ON planned_shifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Руководители могут создавать запланированные смены
CREATE POLICY "Managers can create planned_shifts" ON planned_shifts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Руководители могут обновлять и удалять запланированные смены
CREATE POLICY "Managers can update planned_shifts" ON planned_shifts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

CREATE POLICY "Managers can delete planned_shifts" ON planned_shifts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Администраторы могут видеть только свои запланированные смены
CREATE POLICY "Admins can view own planned_shifts" ON planned_shifts
    FOR SELECT USING (user_id = auth.uid());

-- Обновляем RLS для таблицы users, чтобы менеджеры могли обновлять цвет
CREATE POLICY "Managers can update user color" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );