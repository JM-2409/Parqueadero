-- Script para habilitar las alertas de tiempo en lote de forma predeterminada
-- Dado que los ajustes se manejan como JSONB, si tu parqueadero ya fue creado, puedes actualizar 
-- sus ajustes existentes para incluir esta nueva variable sin perder la configuración anterior.

UPDATE public.parking_lots
SET settings = COALESCE(settings, '{}'::jsonb) || '{"enable_time_alerts": false, "time_limit_hours": 12}'::jsonb
WHERE id IS NOT NULL;
