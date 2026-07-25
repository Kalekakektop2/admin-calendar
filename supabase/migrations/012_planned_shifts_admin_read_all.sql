-- Админы должны видеть все запланированные смены (для вкладки «Мои смены» + фильтр)
DROP POLICY IF EXISTS "Admins can view own planned_shifts" ON planned_shifts;

CREATE POLICY "Staff can view all planned_shifts" ON planned_shifts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Админы могут видеть профили других админов (имена/цвета в календаре)
CREATE POLICY "Staff can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager')
        )
    );