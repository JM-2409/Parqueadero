-- ====================================================================
-- SCRIPT DE REINICIO DE DATOS OPERATIVOS DE PARQUEADERO (SUPABASE SQL)
-- ====================================================================
-- Este script elimina absolutamente todos los datos operativos de un
-- parqueadero específico (historial, tickets, cierres de caja, retiros,
-- abonados/privados e inspecciones) y reinicia el contador de recibos.
--
-- NOTA IMPORTANTE:
-- - NO elimina cuentas de administradores ni empleados.
-- - NO elimina la configuración general ni las tarifas del parqueadero.
-- ====================================================================

-- Reemplace 'ID_DEL_PARQUEADERO_AQUI' con el UUID del parqueadero objetivo.
DO $$
DECLARE
    target_parking_lot_id UUID := 'ID_DEL_PARQUEADERO_AQUI'::UUID;
BEGIN

    -- 1. Eliminar sesiones de parqueo (vehículos activos e historial de entradas/salidas)
    DELETE FROM public.parking_sessions
    WHERE parking_lot_id = target_parking_lot_id;

    -- 2. Eliminar movimientos / retiros de caja
    DELETE FROM public.cash_withdrawals
    WHERE parking_lot_id = target_parking_lot_id;

    -- 3. Eliminar cierres de caja (arqueos)
    DELETE FROM public.cash_closures
    WHERE parking_lot_id = target_parking_lot_id;

    -- 4. Eliminar parqueaderos privados / abonados
    DELETE FROM public.private_parking_spaces
    WHERE parking_lot_id = target_parking_lot_id;

    -- 5. Eliminar inspecciones e inventario de vehículos
    DELETE FROM public.vehicle_inspections
    WHERE parking_lot_id = target_parking_lot_id;

    -- 6. Reiniciar la secuencia de número de ticket/recibo a 0 (el próximo ticket será 1)
    UPDATE public.parking_lots
    SET receipt_sequence = 0
    WHERE id = target_parking_lot_id;

    RAISE NOTICE 'Reinicio completado exitosamente para el parqueadero %', target_parking_lot_id;
END $$;
