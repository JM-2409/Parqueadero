-- ==============================================================================
-- MULTI-TENANT MIGRATION SCRIPT (NON-DESTRUCTIVE)
-- Este script expande la estructura actual para un modelo multi-tenant basado en
-- una tabla superior "companies" (Empresas/Tenants) sin borrar los datos existentes.
-- ==============================================================================

-- 1. Crear tabla base 'companies' (Tenants)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nit TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar y configurar RLS para companies si es necesario (comentado por ahora para mantener compatibilidad)
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 2. Insertar una compañía por defecto si no existe (Fallback para datos existentes)
INSERT INTO companies (name)
SELECT 'Empresa Predeterminada'
WHERE NOT EXISTS (SELECT 1 FROM companies);

-- 3. Actualizar la tabla 'parking_lots' para relacionarla con 'companies'
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Asignar la compañía por defecto a todos los parqueaderos huérfanos para mantener integridad referencial
UPDATE parking_lots
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL;

-- 4. Actualizar la tabla 'profiles' para relacionar a los usuarios con la compañía, no solo con un parqueadero
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- (Opcional) Asignar el company_id basado en su parking_lot_id actual para usuarios existentes
UPDATE profiles p
SET company_id = pl.company_id
FROM parking_lots pl
WHERE p.parking_lot_id = pl.id AND p.company_id IS NULL;

-- 5. Actualizar la tabla 'admin_parking_lots' a 'company_admins' si deseamos que los admins
-- gestionen toda una compañía, o mantenerla. En este caso crearemos 'company_users' para más flexibilidad
CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, profile_id)
);

-- 6. Opcional: Desactivar RLS en 'companies' para el prototipo (igual que las demás tablas)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_users DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- FIN DEL SCRIPT DE MIGRACIÓN
-- ==============================================================================
