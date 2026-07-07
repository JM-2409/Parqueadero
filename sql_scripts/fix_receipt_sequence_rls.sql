-- Eliminar la política anterior que solo permitía a los administradores actualizar la tabla
DROP POLICY IF EXISTS "Parking Lots - Admins update own" ON parking_lots;
DROP POLICY IF EXISTS "Parking Lots - Admins and Employees update own" ON parking_lots;

-- Crear una nueva política que permite tanto a administradores como empleados
-- actualizar la tabla parking_lots (necesario para actualizar receipt_sequence)
CREATE POLICY "Parking Lots - Admins and Employees update own" ON parking_lots
    FOR UPDATE USING (
        parking_lots.id = get_user_parking_lot() AND get_user_role() IN ('admin', 'employee')
    );
