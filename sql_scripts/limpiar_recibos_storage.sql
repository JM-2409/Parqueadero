-- Este script crea una función y activa un "cron job" en PostgreSQL / Supabase
-- para eliminar automáticamente archivos en el storage (bucket "receipts")
-- que tengan más de 7 días de antigüedad.

-- 1. Crear extensión pg_cron (normalmente habilitada por defecto en Supabase, pero por si acaso)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear extensión pg_net (para poder interactuar con la API de Storage si fuera necesario, o en su defecto manejamos la tabla subyacente)
-- La tabla storage.objects contiene la metadata de los archivos.
-- Al borrar en storage.objects, Supabase se encarga de borrar el archivo de S3 eventualmente.

-- 3. Crear función que borra registros de storage.objects que pertenecen al bucket "receipts"
-- y cuya fecha de creación (created_at) es mayor a 7 días.

CREATE OR REPLACE FUNCTION limpiar_recibos_antiguos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'receipts'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 4. Configurar un cron job usando pg_cron que ejecute esta función
-- Se ejecutará todos los días a la medianoche (0 0 * * *)

-- Desactivar cualquier cron anterior con el mismo nombre para evitar duplicados
SELECT cron.unschedule('job_limpiar_recibos');

-- Agendar el nuevo cron
SELECT cron.schedule(
    'job_limpiar_recibos', -- nombre del cron
    '0 0 * * *',           -- expresión cron (todos los días a las 00:00)
    $$ SELECT limpiar_recibos_antiguos(); $$
);

-- Si deseas cambiar el número de días para eliminar los archivos,
-- puedes modificar el "INTERVAL '7 days'" por "'3 days'", "'15 days'", etc.
