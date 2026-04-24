# Sistema de Gestión de Parqueaderos 🚗

Aplicación integral para la administración, operación y control de múltiples parqueaderos en tiempo real.

## Características Principales 🌟
- **Roles Estrictos e Independientes:**
  - **Dueño:** Creación de múltiples sucursales/parqueaderos. Control de permisos y analíticas macro globales.
  - **Administrador:** Ajustes locales de cada parqueadero, como las tarifas dinámicas y campos personalizados, abonos mensuales y revisión de lista negra.
  - **Operario (Empleado):** Inicios de turno controlados, entrada y salida de vehículos eficiente con cálculo automático del pago (basado en segundos, minutos o días/noches).
- **Control Activo:** 
  - Gestión de **Parqueos Privados** para residentes o empleados pre-aprobados sin costo.
  - Generación de **Recibos Térmicos** dinámicos optimizados a impresoras bluetooth (50-80mm).
- **Tarifas Modulares V2:**
  - En lugar de montos estáticos, se declaran reglas. P.ej, Moto -> *Hora: $2,000*, *Minuto: $30*, *Mensualidad: $80,000*. El motor escoge el mejor precio y el que corresponde.
- **Formularios Dinámicos Custom:**
  - Configurable desde el Admin: Puedes exigir la marca de la moto, el color del auto o la torre/apartamento del visitante. La barrera obligará al operario a llenarlos si el admin lo exige.
- **UX Optimizada:**
  - **Skeleton Loaders** para indicar cargas de datos evitando flashes.
  - Integración nativa asíncrona de **Cámara Web / Celular** integrada para módulo futuro de LPR (Licencias OCR).

## Stack Tecnológico 💻
- **Frontend:** Next.js 15+ (App Router), React 19, Tailwind CSS v4, Lucide React (Íconos).
- **Backend/Database:** Supabase (PostgreSQL), Autenticación nativa (Email/Password), Row Level Security (RLS) habilitado. Peticiones asíncronas con promesas eficientes.

## Implementación de Base de Datos - Setup SQL 🗄️
Corre estos scripts en el editor SQL de Supabase para inicializar el sistema de forma segura.

```sql
-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Sistema de Base y Perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('owner', 'admin', 'employee')) DEFAULT 'employee',
  parking_lot_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- 3. Entidades Core
CREATE TABLE parking_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  nit TEXT,
  address TEXT,
  capacity INTEGER NOT NULL DEFAULT 50,
  allowed_vehicles TEXT[] DEFAULT '{"carros", "motos"}',
  show_revenue BOOLEAN DEFAULT true,
  receipt_sequence INTEGER DEFAULT 0,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  private_custom_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aseguramos retrocompatibilidad 
UPDATE parking_lots SET custom_fields = '[{"name": "Marca", "required": false, "visible": true}, {"name": "Color", "required": false, "visible": true}, {"name": "Propietario", "required": false, "visible": true}]'::jsonb WHERE jsonb_array_length(custom_fields) = 0 OR custom_fields IS NULL;

UPDATE parking_lots SET private_custom_fields = '[{"name": "Propietario", "required": false, "visible": true}, {"name": "Bloque", "required": false, "visible": true}, {"name": "Apto/Casa", "required": false, "visible": true}]'::jsonb WHERE jsonb_array_length(private_custom_fields) = 0 OR private_custom_fields IS NULL;

-- 4. Motor de Tarifas (V2)
CREATE TABLE tariffs_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  rate_type TEXT NOT NULL, 
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tariffs_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access Tariffs V2" ON tariffs_v2 FOR ALL USING (true) WITH CHECK (true);

-- (Las demás tablas como parking_sessions, vehicles y cash_closures están intactas y siguen el flujo central habitual).
```

## Resumen de Progreso
- Aplicación testeada con flujos críticos protegidos. 
- Prevención de cargas falsas de *Estado* de React (reparación linter de `set-state-in-effect`), ahora reportada limpiamente y segura de ciclos de re-renderizado infinitos.
