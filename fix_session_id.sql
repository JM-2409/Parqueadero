-- Add session_id to vehicle_inspections
ALTER TABLE public.vehicle_inspections ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.parking_sessions(id) ON DELETE SET NULL;
