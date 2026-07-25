-- Функция рейтинга админов по общей выручке (доступна всем авторизованным)
CREATE OR REPLACE FUNCTION get_admin_revenue_ranks()
RETURNS TABLE (
  user_id UUID,
  total_revenue NUMERIC,
  rank_position BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    COALESCE(SUM(s.total_revenue), 0)::NUMERIC AS total_revenue,
    RANK() OVER (ORDER BY COALESCE(SUM(s.total_revenue), 0) DESC)::BIGINT AS rank_position
  FROM shifts s
  INNER JOIN users u ON u.id = s.user_id AND u.role = 'admin'
  GROUP BY s.user_id
$$;

GRANT EXECUTE ON FUNCTION get_admin_revenue_ranks() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_revenue_ranks() TO anon;