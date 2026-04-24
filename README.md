# Sistema de Gestión de Parqueadero

Aplicación web integral para la administración, control y cobro de parqueaderos (tanto públicos/visitantes como parqueaderos privados o residenciales). Desarrollada con **Next.js**, **React**, **Tailwind CSS** y **Supabase**.

## Características Principales

*   **Ingreso y Salida de Vehículos**: Registro rápido con autocompletado de placas, cobro automático e impresión de recibos de entrada y salida térmica.
*   **Gestión de Tarifas (Cobro Fraccionado y por Turnos)**:
    *   Configuración de tarifas Diurnas y Nocturnas con horas de inicio programables.
    *   Cobro exacto y fraccionado según los minutos de tolerancia (gracia) o configuraciones de bloque de horas.
    *   **Historial de Cambios de Tarifas:** Registro visual de la auditoría y cambios que se hayan aplicado sobre los cobros a través del tiempo.
*   **Personalización Dinámica de Atributos**:
    *   Posibilidad de activar, desactivar, hacer obligatorios y renombrar campos "por defecto" del sistema (ej. *Marca, Color, Propietario, Bloque, Apartamento*).
    *   Creación de **Campos Personalizados** dinámicos totalmente libres e ilimitados.
    *   Información inyectada a la base de datos a través de JSONB para integraciones robustas e impresión de tickets.
*   **Parqueaderos Privados y Abonados**: Gestión mensual, asignación de bloques y apartamentos, y opción de importar/exportar censos desde Excel (CSV).
*   **Lista Negra**: Bloqueo instantáneo con motivo predefinido para vehículos que no tienen permitida la entrada.
*   **Múltiples Roles**: Panel de Administrador (Insights, configuración de sistema y empleados) y Panel de Vigilante/Empleado (Solo operación de ingreso, salida, historial de turno y parqueo privado).

## Requisitos Previos e Instalación

1. Clona el repositorio:
   ```bash
   git clone <tu_repositorio>
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno en el archivo `.env.local` conectándolas a tu proyecto de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```
4. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```

## Actualizaciones de Base de Datos (SQL Migrations)
Si despliegas este proyecto o actualizas tu instancia en Supabase, asegúrate de correr el siguiente script en el **SQL Editor** para activar las últimas funcionalidades (Historial de tarifas, Custom Data y Centralización de campos por defecto):

```sql
-- 1. Soporte JSONB para datos extras y campos personalizados
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}';

-- 2. Tabla historial de tarifas
CREATE TABLE IF NOT EXISTS tariff_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  charge_type TEXT NOT NULL, 
  day_rate INTEGER DEFAULT 0,
  night_rate INTEGER DEFAULT 0,
  day_start_time TEXT,
  night_start_time TEXT,
  free_minutes INTEGER DEFAULT 0,
  block_hours INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tariff_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Tariff History" ON tariff_history;
CREATE POLICY "Public Access Tariff History" ON tariff_history FOR ALL USING (true) WITH CHECK (true);

-- 3. Consolidación de campos nativos a variables dinámicas en JSONB
-- Para Visitantes (Marca, Color, Propietario por defecto)
UPDATE parking_lots
SET custom_fields = '[{"name": "Marca", "required": false}, {"name": "Color", "required": false}, {"name": "Propietario", "required": false}]'::jsonb
WHERE jsonb_array_length(custom_fields) = 0 OR custom_fields IS NULL;

-- Para Privados (Propietario, Bloque, Apto/Casa por defecto)
UPDATE parking_lots
SET private_custom_fields = '[{"name": "Propietario", "required": false, "visible": true}, {"name": "Bloque", "required": false, "visible": true}, {"name": "Apto/Casa", "required": false, "visible": true}]'::jsonb
WHERE jsonb_array_length(private_custom_fields) = 0 OR private_custom_fields IS NULL;

-- 4. Migración de datos existentes de "private_parking_spaces" al nuevo formato JSONB
UPDATE private_parking_spaces
SET custom_fields_data = COALESCE(custom_fields_data, '{}'::jsonb) 
    || jsonb_build_object('Propietario', COALESCE(NULLIF(owner_name, ''), '')) 
    || jsonb_build_object('Bloque', COALESCE(NULLIF(block, ''), '')) 
    || jsonb_build_object('Apto/Casa', COALESCE(NULLIF(house_or_apartment, ''), ''))
WHERE (owner_name IS NOT NULL AND owner_name != '')
   OR (block IS NOT NULL AND block != '')
   OR (house_or_apartment IS NOT NULL AND house_or_apartment != '');

-- 5. Sistema Avanzado de Tarifas por Reglas Múltiples (V2)
CREATE TABLE IF NOT EXISTS tariffs_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  rate_type TEXT NOT NULL, 
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tariffs_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Tariffs V2" ON tariffs_v2;
CREATE POLICY "Public Access Tariffs V2" ON tariffs_v2 FOR ALL USING (true) WITH CHECK (true);
```
