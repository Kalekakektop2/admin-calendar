-- Упрощение RLS политик для shift_photos
-- Это должно решить проблему с загрузкой фотографий у руководителя

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view photos of own shifts" ON shift_photos;
DROP POLICY IF EXISTS "Users can upload photos to own shifts" ON shift_photos;
DROP POLICY IF EXISTS "Managers can view all photos" ON shift_photos;
DROP POLICY IF EXISTS "Managers can delete any photos" ON shift_photos;
DROP POLICY IF EXISTS "Admins can delete own photos" ON shift_photos;

-- Создаем новые более простые политики

-- Администраторы могут видеть все фото (через связь с shifts)
CREATE POLICY "Admins can view photos" ON shift_photos
    FOR SELECT USING (
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

-- Администраторы могут загружать фото для своих смен
CREATE POLICY "Admins can upload photos" ON shift_photos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Администраторы могут удалять свои фото
CREATE POLICY "Admins can delete own photos" ON shift_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shifts 
            WHERE shifts.id = shift_photos.shift_id 
            AND shifts.user_id = auth.uid()
        )
    );

-- Руководители могут удалять любые фото
CREATE POLICY "Managers can delete any photos" ON shift_photos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    );
