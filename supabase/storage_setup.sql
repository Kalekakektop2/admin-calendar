-- Настройка Storage bucket для фотографий смен
-- Этот SQL должен быть выполнен в Supabase SQL Editor

-- Создание bucket для хранения фотографий смен
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shift-photos', 
    'shift-photos', 
    false, 
    5242880, -- 5MB лимит
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Политики RLS для Storage bucket

-- Администраторы могут загружать фото
CREATE POLICY "Admins can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'shift-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Администраторы могут просматривать свои фото
CREATE POLICY "Admins can view own photos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'shift-photos' AND
    (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'manager'
        )
    )
);

-- Руководители могут просматривать все фото
CREATE POLICY "Managers can view all photos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'shift-photos' AND
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'manager'
    )
);

-- Администраторы могут удалять свои фото
CREATE POLICY "Admins can delete own photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'shift-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Руководители могут удалять любые фото
CREATE POLICY "Managers can delete any photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'shift-photos' AND
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'manager'
    )
);
