-- Источник смены и защита ручных правок руководителя от перезаписи Google
ALTER TABLE planned_shifts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('google', 'manual'));

ALTER TABLE planned_shifts
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT false;

-- Старые записи считаем ручными (не трогать Google-синком)
UPDATE planned_shifts
SET source = 'manual', manual_override = true
WHERE source IS NULL OR source = 'manual';

COMMENT ON COLUMN planned_shifts.source IS 'google = из таблицы Google; manual = поставил руководитель';
COMMENT ON COLUMN planned_shifts.manual_override IS 'true = руководитель менял вручную: Google не перезаписывает и не удаляет';

-- Слоты, которые руководитель убрал вручную — Google не должен снова ставить
CREATE TABLE IF NOT EXISTS planned_shift_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type shift_type NOT NULL DEFAULT 'day',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (user_id, shift_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_planned_shift_blocks_date ON planned_shift_blocks(shift_date);

ALTER TABLE planned_shift_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage planned_shift_blocks" ON planned_shift_blocks;
CREATE POLICY "Managers manage planned_shift_blocks" ON planned_shift_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

DROP POLICY IF EXISTS "Staff can view planned_shift_blocks" ON planned_shift_blocks;
CREATE POLICY "Staff can view planned_shift_blocks" ON planned_shift_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );
