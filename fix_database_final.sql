-- 1. Add session_id to vehicle_inspections if not exists
ALTER TABLE public.vehicle_inspections ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.parking_sessions(id) ON DELETE SET NULL;

-- 2. Force schema cache reload
NOTIFY pgrst, 'reload schema';
