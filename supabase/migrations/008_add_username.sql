-- Добавление поля username для логина администраторов
-- Это позволит руководителям создавать уникальные логины для администраторов

-- Добавляем поле username в таблицу users
ALTER TABLE users 
ADD COLUMN username TEXT UNIQUE;

-- Создаем индекс для быстрого поиска по username
CREATE INDEX idx_users_username ON users(username);

-- Обновляем существующих пользователей (генерируем username из email до @)
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;
