DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'private_parking_spaces'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.private_parking_spaces;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'private_parking_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.private_parking_history;
  END IF;
END
$$;
