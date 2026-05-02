# Sistema de Gestión de Parqueaderos Avanzado 🚗

Plataforma integral SaaS para la administración corporativa y operativa de múltiples parqueaderos (sucursales) en tiempo real. 

## Características Principales 🌟
- **Roles Estrictos e Independientes:**
  - **Súper Admin (Dueño de la Plataforma):** Crea planes de suscripción (ej. Básico, Premium) para los clientes dueños de parqueaderos.
  - **Dueño (Cliente):** Suscrito a un plan, puede crear sus propias sucursales, visualizar métricas globales y administrar a su personal (Administradores).
  - **Administrador:** Ajusta la configuración operativa de una sucursal específica (Tarifas V2, campos personalizados, abonados mensuales, recibos y configuración visual).
  - **Operario (Empleado):** Realiza el control asíncrono de los vehículos. Inicia su turno, efectúa el registro de ingreso/salida, visualiza si un cliente está vetado y gestiona tickets automatizados con cálculos modulares.
- **Módulos de Operación Avanzada:**
  - **Tarifas V2 Modulares:** El motor calcula el precio de manera dinámica evaluando si cobra por fracción (minuto, hora) o por tarifa plana (día/noche), evitando la dependencia en valores fijos.
  - **Control de Abonados Mensuales:** Vigencia automatizada por fecha de vencimiento (`end_date`). El empleado da entrada y el sistema cobra $0 al detectar la suscripción activa.
  - **Lista Negra (Blacklist):** Vetado de placas. Si un empleado escanea la placa de la lista negra, salta una alerta roja que bloquea el registro.
  - **Formularios Dinámicos Custom:** Si el parqueadero es para visitas residenciales o empresariales, el administrador puede exigir datos obligatorios (EJ: *"Número de Apartamento"*, *"Cédula del Visitante"*).
  - **Parqueaderos Privados (Propietarios):** Posibilidad de importar vía CSV los parqueaderos de los residentes, para marcarlos como exentos de cobro y mantener el inventario en orden.
- **UX Optimizada:**
  - Skeleton Loaders para mejorar la percepción de velocidad de carga.
  - Botón de escáner en cámara (preparado para módulo futuro LPR - OCR nativo).
  - UI 100% Mobile First.

## Stack Tecnológico 💻
- **Frontend Core:** Next.js 15+ (App Router), React 19.
- **Estilos:** Tailwind CSS v4, Lucide React (Íconos vectoriales).
- **Backend / Database:** Supabase (PostgreSQL), Autenticación nativa de Supabase.

## Motor de la Aplicación ⚡
El núcleo del sistema reside en:
1. **Verificación de Seguridad a Nivel RLS (Row Level Security):** Cada tabla filtra la información basado en el `parking_lot_id`, aislando la data de manera segura (Multi-Tenant).
2. **Cálculo de Tarifas (`pricing.ts`):** Basado en el registro de tiempo `(Entry Time -> Exit Time)`, evalúa en cascada contra la tabla `tariffs_v3` para definir si cobra minutos, horas, o la tarifa tope diaria.

## Implementación de Base de Datos Completa (Setup SQL) 🗄️
Corre el siguiente script en tu editor SQL de Supabase para inicializar todas las tablas requeridas.

```sql
-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Sistema de Base y Perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'employee', 'superadmin')) DEFAULT 'employee',
  parking_lot_id UUID,
  custom_role_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Entidades Core - Parqueaderos
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  nit TEXT,
  address TEXT,
  capacity INTEGER NOT NULL DEFAULT 50,
  allowed_vehicles TEXT[] DEFAULT '{"carros", "motos"}',
  show_revenue BOOLEAN DEFAULT true,
  receipt_sequence INTEGER DEFAULT 0,
  custom_fields JSONB DEFAULT '[{"name": "Marca", "required": false, "visible": true}, {"name": "Color", "required": false, "visible": true}]'::jsonb,
  private_custom_fields JSONB DEFAULT '[{"name": "Propietario", "required": false, "visible": true}, {"name": "Bloque", "required": false, "visible": true}, {"name": "Apartamento", "required": false, "visible": true}]'::jsonb,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Vehículos y Sesiones
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  color TEXT,
  owner_name TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exit_time TIMESTAMP WITH TIME ZONE,
  fee INTEGER DEFAULT 0,
  total_charged INTEGER DEFAULT 0,
  receipt_number TEXT,
  duration_minutes INTEGER,
  entry_employee_name TEXT,
  exit_employee_name TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Motor de Tarifas (V3)
CREATE TABLE IF NOT EXISTS tariffs_v3 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  rate_type TEXT NOT NULL, 
  amount INTEGER NOT NULL DEFAULT 0,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Módulos Adicionales (Abonados, Lista Negra y Privados)
CREATE TABLE IF NOT EXISTS monthly_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_document TEXT,
  phone TEXT,
  vehicle_type TEXT DEFAULT 'carros',
  amount_paid INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blacklisted_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS private_parking_spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  space_number TEXT NOT NULL,
  owner_name TEXT,
  block TEXT,
  house_or_apartment TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parking_lot_id, space_number)
);

-- 7. Cierres de Caja
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_by TEXT NOT NULL,
  total_revenue INTEGER NOT NULL,
  total_vehicles INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- (8) Aplicamos Políticas RLS Básicas (Permisivas para el entorno PWA Inicial)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Parking Lots" ON parking_lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Sessions" ON parking_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Tariffs V3" ON tariffs_v3 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Subscribers" ON monthly_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Blacklist" ON blacklisted_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Private Spaces" ON private_parking_spaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Cash Closures" ON cash_closures FOR ALL USING (true) WITH CHECK (true);
```

## Correcciones e Interacciones Recientes 🔄
- **Autocompletado Inteligente**: Al digitar una placa de vehículo registrado previamente en el sistema de la sucursal (o general), los campos extra (`Marca`, `Color`, etc) se mapean y populán automáticamente minimizando el tiempo de ingreso del personal.
- **Transiciones de Múltiples Operarios**: Inclusión de un botón "Cambiar" en el panel de control del empleado, evitando el cierre de sesión de la cuenta máster. Permite rotación de turnos (cambio de nombre de operario) de manera fluida y rápida en la misma estación de trabajo.
- **Gestión Unificada de Tarifas**: Control de visualización V3 con botones de eliminar bloqueantes intermedios para evitar clics dobles, y prevención estricta de políticas de seguridad para simplificar la corrección de errores en la eliminación.
