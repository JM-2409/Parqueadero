-- SQL para actualizar el sistema de recibos
-- 1. Limpiar recibos que no sean puramente numéricos (por seguridad antes de la conversión)
UPDATE parking_sessions
SET receipt_number = NULL
WHERE receipt_number !~ '^[0-9]+$';

-- 2. Cambiar el tipo de la columna a BIGINT para permitir ordenamiento numérico
ALTER TABLE parking_sessions
ALTER COLUMN receipt_number TYPE BIGINT USING receipt_number::BIGINT;

-- 3. Eliminar duplicados existentes antes de aplicar la restricción única
DELETE FROM parking_sessions a USING parking_sessions b
WHERE a.created_at < b.created_at
  AND a.parking_lot_id = b.parking_lot_id
  AND a.receipt_number = b.receipt_number;

-- 4. Añadir restricción de unicidad
ALTER TABLE parking_sessions
ADD CONSTRAINT unique_receipt_per_lot UNIQUE (parking_lot_id, receipt_number);

-- 5. Sincronizar la secuencia de cada parqueadero con el máximo recibo existente
-- Esto evita que los recibos automáticos choquen con los que se metieron manuales
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM parking_lots LOOP
        UPDATE parking_lots
        SET receipt_sequence = COALESCE((SELECT MAX(receipt_number) FROM parking_sessions WHERE parking_lot_id = r.id), 0)
        WHERE id = r.id;
    END LOOP;
END $$;
