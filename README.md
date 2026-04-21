# Sistema de Parqueaderos (ParkManager)

Sistema completo para la gestión de parqueaderos institucionales y comerciales, con roles de Dueño (Super Admin), Administrador y Empleado.

## Historial de Revisiones - Versión Actual
1. **Nuevos Filtros de Búsqueda:** Búsqueda por documento en Abolados, búsqueda por nombre de empleado (entrada y salida) en Historial Admin.
2. **Historial de Tarifas Dinámicas:** Refactorizada la función del cobro de turnos para soportar fracciones relativas al turno específico (Día o Noche).
3. **Manejo de Roles:** Gestión total de planes de suscripción (`SuperAdmin`) para activar o desactivar características para clientes (`Admins`).
4. **Campos Recibo:** Se agregó `extra_data` como visualización obligatoria en los recibos impresos de ingreso/salida.
5. **Esquema de Base de datos:** Búsquedas protegidas y roles robustecidos a nivel RLS y API.

## Características Principales

- **Gestión Multi-Planes (Suscripciones)**: El super admin puede "Activar/Desactivar" características de los planes como Roles Personalizados, Múltiples Sucursales y Mensualidades.
- **Autenticación por Usuario**: Inicio de sesión simplificado utilizando nombres de usuario cortos (`ej: guarda1`). 
- **Tarifas Dinámicas (Turnos y Horas)**: Configuración experta de turnos (Día, Noche) que permiten cobro "Fraccionado" dependiendo del tiempo transcurrido en el bloque de día determinado, más su periodo de gracia (Gabela).
- **Control Detallado del Vehículo**: Permite campos *personalizados* (ej. requerir `Color` o `Marca` al guardar un registro), sugerencias por autocompletado en la base local, visualizando recibos en miniaturas en `Admin History`.
- **Diseño Ultra-Responsivo**: Componentes `Tailwind` altamente acoplados para funcionar en Móviles (uso de operarios en campo) y en PCs (Dueño o Administrador en oficina).

## Solución de Problemas y Requisitos Previos

### Actualización de la Base de Datos
Para que las nuevas funcionalidades operen con los esquemas actuales, copia esto en tu **SQL Editor** de tu cuenta de Supabase:

```sql
-- COMPLETE SYSTEM SCHEMA RE-FACTORY

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. App Settings (Global Platform Options)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name TEXT DEFAULT 'Sistema de Parqueaderos',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  max_branches INTEGER DEFAULT 1,
  allow_custom_roles BOOLEAN DEFAULT true,
  allow_monthly_subscribers BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Tiers if empty
INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Básico', 50000, 1, false, false
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Básico');

INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Premium', 120000, 1, true, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Premium');

INSERT INTO subscription_plans (name, price, max_branches, allow_custom_roles, allow_monthly_subscribers)
SELECT 'Multi-Sede (Avanzado)', 250000, 5, true, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Multi-Sede (Avanzado)');

-- 3. Parking Lots (Branches)
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  nit TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  phone_contact TEXT,
  capacity INTEGER DEFAULT 100,
  allowed_vehicles JSONB DEFAULT '["motos", "carros", "bicicletas"]',
  show_revenue BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '[]',
  lost_ticket_fee NUMERIC DEFAULT 15000,
  is_suspended BOOLEAN DEFAULT false,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure ALL existing parking lots have a baseline plan assigned
UPDATE parking_lots SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'Básico' LIMIT 1) WHERE plan_id IS NULL;

-- 4. User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'employee')),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  custom_role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ... Continuación del script (Véa `/supabase-schema.sql` en el panel de su proyecto)
-- AÑADE LAS SIGUIENTES TRES NUEVAS COLUMNAS SI EL COMANDO DE PREVIAMENTE DIO ERROR:
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS owner_document TEXT;
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carros';
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
```

## Creación del Super Administrador (Dueño) Inicial

Como las identidades se administran dinámicamente según validación, el dueño TIENE que ser insertado `auth.users` primero si se clona nuevamente desde cero:
Añade manualmente esto en Supabase `SQL Editor`:

```sql
INSERT INTO auth.users (id, instance_id, email, encrypted_password, role, aud, email_confirmed_at) 
VALUES (uuid_generate_v4(), '00000000-0000-0000-0000-000000000000', 'superadmin@parkingapp.com', crypt('TuContraseñaSegura123', gen_salt('bf')), 'authenticated', 'authenticated', NOW());
-- Cambie la contraseña por la de su elección

-- LUEGO INSERTA SU PERFIL CON ESE MISMO ID:
INSERT INTO profiles (id, email, role)
SELECT id, email, 'superadmin' 
FROM auth.users 
WHERE email = 'superadmin@parkingapp.com';
```

---
*Gracias por usar **ParkManager**! Construido para ser seguro, rápido y adaptable a todo caso de negocio.*
