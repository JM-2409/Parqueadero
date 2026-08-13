-- ================================================================
-- ACTIVAR REALTIME EN device_approvals
-- Ejecutar este script en Supabase SQL Editor
-- ================================================================

-- 1. Habilitar replicación en la tabla device_approvals
ALTER TABLE public.device_approvals REPLICA IDENTITY FULL;

-- 2. Agregar la tabla a la publicación de Realtime de Supabase
-- (Si ya está, el DO NOTHING evita error)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'device_approvals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_approvals;
  END IF;
END $$;

-- 3. Verificar que quedó correctamente habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'device_approvals';
