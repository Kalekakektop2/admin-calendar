-- Включение расширения для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание перечисления для ролей пользователей
CREATE TYPE user_role AS ENUM ('admin', 'manager');

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Таблица смен
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    total_revenue DECIMAL(20, 2) NOT NULL,
    cash_balance DECIMAL(20, 2) NOT NULL,
    card_revenue DECIMAL(20, 2) NOT NULL,
    bonus_amount DECIMAL(20, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Таблица фотографий смен
CREATE TABLE shift_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_path TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shift_photos_shift_id ON shift_photos(shift_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_photos ENABLE ROW LEVEL SECURITY;

-- Политики RLS для users
-- Администраторы могут видеть всех пользователей
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Пользователи могут видеть только свой профиль
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- Политики RLS для shifts
-- Администраторы могут видеть только свои смены
CREATE POLICY "Admins can view own shifts" ON shifts
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Администраторы могут создавать свои смены
CREATE POLICY "Admins can create own shifts" ON shifts
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Администраторы могут обновлять свои смены
CREATE POLICY "Admins can update own shifts" ON shifts
    FOR UPDATE USING (user_id = auth.uid());

-- Руководители могут видеть все смены
CREATE POLICY "Managers can view all shifts" ON shifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Политики RLS для shift_photos
-- Администраторы могут видеть фото своих смен
CREATE POLICY "Users can view photos of own shifts" ON shift_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND (shifts.user_id = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM users 
                     WHERE id = auth.uid() AND role = 'manager'
                 ))
        )
    );

-- Администраторы могут загружать фото для своих смен
CREATE POLICY "Users can upload photos to own shifts" ON shift_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Руководители могут видеть все фото
CREATE POLICY "Managers can view all photos" ON shift_photos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Вставка тестового пользователя-руководителя
INSERT INTO users (email, full_name, role) 
VALUES ('manager@example.com', 'Руководитель', 'manager')
ON CONFLICT (email) DO NOTHING;
