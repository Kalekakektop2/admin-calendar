-- Удаление избыточного ограничения valid_revenue
-- Это ограничение требует total_revenue >= cash_balance + card_revenue
-- Но на практике это может быть не всегда верно (например, при корректировках)

-- Удаляем ограничение
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS valid_revenue;
