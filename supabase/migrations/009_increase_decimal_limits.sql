-- Увеличиваем лимиты для числовых полей для избежания overflow
-- DECIMAL(20, 2) позволяет хранить до 999,999,999,999,999,999.99

-- Увеличиваем лимит для total_revenue
ALTER TABLE shifts 
ALTER COLUMN total_revenue TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для cash_balance
ALTER TABLE shifts 
ALTER COLUMN cash_balance TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для card_revenue
ALTER TABLE shifts 
ALTER COLUMN card_revenue TYPE DECIMAL(20, 2);

-- Увеличиваем лимит для bonus_amount
ALTER TABLE shifts 
ALTER COLUMN bonus_amount TYPE DECIMAL(20, 2);
