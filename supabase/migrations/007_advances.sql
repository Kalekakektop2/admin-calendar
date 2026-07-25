-- Создаем таблицу авансов
CREATE TABLE IF NOT EXISTS advances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Включаем RLS
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view own advances" ON advances;
DROP POLICY IF EXISTS "Managers can view all advances" ON advances;
DROP POLICY IF EXISTS "Managers can create advances" ON advances;
DROP POLICY IF EXISTS "Managers can update advances" ON advances;
DROP POLICY IF EXISTS "Managers can delete advances" ON advances;

-- Политика: Администраторы видят только свои авансы
CREATE POLICY "Users can view own advances"
  ON advances FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: Руководители видят все авансы
CREATE POLICY "Managers can view all advances"
  ON advances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут создавать авансы
CREATE POLICY "Managers can create advances"
  ON advances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут обновлять авансы
CREATE POLICY "Managers can update advances"
  ON advances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут удалять авансы
CREATE POLICY "Managers can delete advances"
  ON advances FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );
