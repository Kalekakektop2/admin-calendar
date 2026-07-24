-- Создаем таблицу штрафов
CREATE TABLE IF NOT EXISTS fines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  fine_date DATE NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Если колонка date существует, удаляем её (она больше не нужна)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fines' AND column_name = 'date'
  ) THEN
    ALTER TABLE fines DROP COLUMN date;
  END IF;
END $$;

-- Включаем RLS
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view own fines" ON fines;
DROP POLICY IF EXISTS "Managers can view all fines" ON fines;
DROP POLICY IF EXISTS "Managers can create fines" ON fines;
DROP POLICY IF EXISTS "Managers can update fines" ON fines;
DROP POLICY IF EXISTS "Managers can delete fines" ON fines;

-- Политика: Администраторы видят только свои штрафы
CREATE POLICY "Users can view own fines"
  ON fines FOR SELECT
  USING (auth.uid() = user_id);

-- Политика: Руководители видят все штрафы
CREATE POLICY "Managers can view all fines"
  ON fines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут создавать штрафы
CREATE POLICY "Managers can create fines"
  ON fines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут обновлять штрафы
CREATE POLICY "Managers can update fines"
  ON fines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );

-- Политика: Руководители могут удалять штрафы
CREATE POLICY "Managers can delete fines"
  ON fines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
    )
  );
