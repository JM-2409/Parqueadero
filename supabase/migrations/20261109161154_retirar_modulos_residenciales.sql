BEGIN;

DO $$
DECLARE
  table_name text;
  residential_tables text[] := ARRAY[
    'building_modules',
    'residents',
    'pedestrian_visitors',
    'moving_permits',
    'packages',
    'resident_requests',
    'resident_documents',
    'document_requirements',
    'common_areas'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'resident') THEN
    RAISE EXCEPTION 'Retiro detenido: existen perfiles resident que deben ser migrados primero.';
  END IF;

  CREATE SCHEMA retired_residential_20261109;
  REVOKE ALL ON SCHEMA retired_residential_20261109 FROM PUBLIC, anon, authenticated;

  FOREACH table_name IN ARRAY residential_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'CREATE TABLE retired_residential_20261109.%I AS TABLE public.%I',
        table_name,
        table_name
      );
    END IF;
  END LOOP;

  IF to_regclass('public.whatsapp_log') IS NOT NULL THEN
    EXECUTE 'CREATE TABLE retired_residential_20261109.whatsapp_log AS
      SELECT * FROM public.whatsapp_log WHERE type IN (''package'', ''moving_permit'')';
    EXECUTE 'DELETE FROM public.whatsapp_log WHERE type IN (''package'', ''moving_permit'')';
    EXECUTE 'ALTER TABLE public.whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_type_check';
    EXECUTE 'ALTER TABLE public.whatsapp_log ADD CONSTRAINT whatsapp_log_type_check
      CHECK (type IN (''parking'', ''general''))';
  END IF;

  REVOKE ALL ON ALL TABLES IN SCHEMA retired_residential_20261109
    FROM PUBLIC, anon, authenticated;
END
$$;

DROP TABLE IF EXISTS public.resident_documents;
DROP TABLE IF EXISTS public.resident_requests;
DROP TABLE IF EXISTS public.document_requirements;
DROP TABLE IF EXISTS public.common_areas;
DROP TABLE IF EXISTS public.packages;
DROP TABLE IF EXISTS public.moving_permits;
DROP TABLE IF EXISTS public.pedestrian_visitors;
DROP TABLE IF EXISTS public.residents;
DROP TABLE IF EXISTS public.building_modules;

ALTER TABLE public.private_parking_spaces
  DROP COLUMN IF EXISTS resident_id;
ALTER TABLE public.parking_lots
  DROP COLUMN IF EXISTS doc_update_start,
  DROP COLUMN IF EXISTS doc_update_end;

COMMIT;
