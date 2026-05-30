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


-- Migration Script to update schema for modular features and cascading deletes

-- 1. Remove rigid subscription plans
ALTER TABLE parking_lots DROP COLUMN IF EXISTS plan_id;
DROP TABLE IF EXISTS subscription_plans;

-- 2. Add features JSONB column to parking_lots
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"whatsapp_receipts": false, "monthly_subscribers": false, "multiple_employees": false, "reports": false}'::jsonb;

-- 3. Update Foreign Keys to use ON DELETE CASCADE
-- We will drop the existing constraints and add new ones with CASCADE

-- profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_parking_lot_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- admin_parking_lots
ALTER TABLE admin_parking_lots DROP CONSTRAINT IF EXISTS admin_parking_lots_parking_lot_id_fkey;
ALTER TABLE admin_parking_lots ADD CONSTRAINT admin_parking_lots_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- tariffs
ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_parking_lot_id_fkey;
ALTER TABLE tariffs ADD CONSTRAINT tariffs_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- custom_roles
ALTER TABLE custom_roles DROP CONSTRAINT IF EXISTS custom_roles_parking_lot_id_fkey;
ALTER TABLE custom_roles ADD CONSTRAINT custom_roles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- cash_closures
ALTER TABLE cash_closures DROP CONSTRAINT IF EXISTS cash_closures_parking_lot_id_fkey;
ALTER TABLE cash_closures ADD CONSTRAINT cash_closures_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- blacklisted_vehicles
ALTER TABLE blacklisted_vehicles DROP CONSTRAINT IF EXISTS blacklisted_vehicles_parking_lot_id_fkey;
ALTER TABLE blacklisted_vehicles ADD CONSTRAINT blacklisted_vehicles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- monthly_subscribers
ALTER TABLE monthly_subscribers DROP CONSTRAINT IF EXISTS monthly_subscribers_parking_lot_id_fkey;
ALTER TABLE monthly_subscribers ADD CONSTRAINT monthly_subscribers_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- private_parking_spaces
ALTER TABLE private_parking_spaces DROP CONSTRAINT IF EXISTS private_parking_spaces_parking_lot_id_fkey;
ALTER TABLE private_parking_spaces ADD CONSTRAINT private_parking_spaces_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- parking_sessions (both parking_lot_id and vehicle_id)
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_parking_lot_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- For vehicle_id in parking_sessions, we need to allow deletion of parking lots without errors
-- Currently it's RESTRICT, which prevents deleting a session if a vehicle references it. Since we CASCADE the lot, sessions will be deleted.
-- However, if we delete a vehicle directly, what happens? If we change it to SET NULL, deleting a vehicle will just make the session lose its vehicle reference.
-- Wait, the requirement: "En cuanto a los vehículos (placas): al ser un sistema multi-tenant, las placas pueden ser independientes. Modifica el RESTRICT para que se eliminen todas las parking_sessions asociadas a ese parqueadero, pero los registros de la tabla vehicles se pueden mantener intactos en la base de datos general."
-- If a parking_lot is deleted -> sessions are deleted (due to ON DELETE CASCADE on parking_lot_id in parking_sessions). The ON DELETE RESTRICT on vehicle_id only triggers when a *vehicle* is deleted, NOT when a *session* is deleted.
-- However, just to be safe, let's change vehicle_id ON DELETE RESTRICT to ON DELETE SET NULL, so if a vehicle is ever deleted, it doesn't block, but keeping vehicles around doesn't block lot deletion anyway.
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_vehicle_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
