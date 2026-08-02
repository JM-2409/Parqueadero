-- ==============================================================================
-- SOLUCIÓN DEFINITIVA PARA LA TABLA tariffs_v3 EN SUPABASE
-- ==============================================================================

-- 1. Habilitar RLS en la tabla tariffs_v3 (si existe) y limpiar políticas anteriores
ALTER TABLE IF EXISTS tariffs_v3 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tariffs_V3 - Access own parking lot" ON tariffs_v3;
DROP POLICY IF EXISTS "Tariffs_V3 - Read authenticated" ON tariffs_v3;
DROP POLICY IF EXISTS "Tariffs_V3 - Authenticated Access" ON tariffs_v3;

-- 2. Otorgar acceso completo de lectura y escritura a usuarios autenticados en tariffs_v3
CREATE POLICY "Tariffs_V3 - Authenticated Access" ON tariffs_v3 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 3. Asegurar que la tabla auxiliar tariffs también tenga acceso completo
ALTER TABLE IF EXISTS tariffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tariffs - Access own parking lot" ON tariffs;
DROP POLICY IF EXISTS "Tariffs - Read authenticated" ON tariffs;
DROP POLICY IF EXISTS "Tariffs - Authenticated Access" ON tariffs;

CREATE POLICY "Tariffs - Authenticated Access" ON tariffs 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
