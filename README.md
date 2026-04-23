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

-- 3. Configuración centralizada de campos del sistema para el Admin
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS default_fields_config JSONB DEFAULT '{}';

UPDATE parking_lots SET default_fields_config = '{
  "visitors": {
    "brand": { "visible": true, "required": false, "label": "Marca" },
    "color": { "visible": true, "required": false, "label": "Color" },
    "owner_name": { "visible": true, "required": false, "label": "Propietario" }
  },
  "private": {
    "owner_name": { "visible": true, "required": false, "label": "Propietario/Residente" },
    "block": { "visible": true, "required": false, "label": "Bloque/Torre" },
    "house_or_apartment": { "visible": true, "required": false, "label": "Apto/Casa" }
  }
}' WHERE default_fields_config = '{}' OR default_fields_config IS NULL;
```
