# Sistema de Parqueaderos (ParkManager)

Sistema completo para la gestión de parqueaderos, con roles de Dueño (Super Admin), Administrador y Empleado.

## Características Principales

- **Landing Page**: Página de inicio completa con información del producto, planes y formulario de contacto funcional.
- **Autenticación por Usuario**: Inicio de sesión simplificado utilizando nombres de usuario en lugar de correos electrónicos.
- **Super Admin (Dueño)**: Gestión global de parqueaderos, creación de administradores con nombre de usuario, configuración de nombre y logo (soporta subida de imágenes).
- **Administrador**: Configuración de tarifas (por minuto, fracción, hora, bloque, día/noche), creación de **campos personalizados dinámicos (obligatorios u opcionales)** para la admisión, gestión de empleados con nombre de usuario y visualización de historial completo.
- **Empleado**: Registro de ingresos y salidas con validación de campos obligatorios, control de turnos obligatorio, cálculo automático de tarifas, generación e impresión de recibos con numeración consecutiva.
- **Diseño Responsivo**: Interfaz optimizada para funcionar perfectamente tanto en computadoras de escritorio como en dispositivos móviles.

## Solución de Problemas Comunes

### 1. Problema: "Supabase pide verificar correo pero el correo no existe"
Por defecto, Supabase requiere que los usuarios confirmen su correo electrónico. Si estás usando correos ficticios para pruebas, debes desactivar esta opción:
1. Ve a tu panel de Supabase (https://supabase.com/dashboard).
2. Selecciona tu proyecto.
3. En el menú lateral izquierdo, ve a **Authentication** -> **Providers**.
4. Haz clic en **Email**.
5. Apaga el interruptor que dice **"Confirm email"**.
6. Guarda los cambios. Ahora podrás iniciar sesión inmediatamente después de crear un usuario.

### 2. Actualización de la Base de Datos (¡IMPORTANTE!)
Para que las nuevas funcionalidades (Campos personalizados, Control de turnos, Logo en Base64, Numeración consecutiva y Retención de 7 días) funcionen correctamente, **debes ejecutar el siguiente código SQL** en tu base de datos de Supabase:

1. Ve a tu panel de Supabase.
2. En el menú lateral izquierdo, selecciona **SQL Editor**.
3. Haz clic en "New query".
4. Pega y ejecuta el siguiente código:

```sql
-- 1. Añadir soporte para campos personalizados en los parqueaderos
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- 2. Añadir soporte para el control de turnos y datos extra en las sesiones
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS entry_employee_name TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS exit_employee_name TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- 3. Asegurar que el logo pueda almacenar imágenes en Base64 (texto largo)
ALTER TABLE app_settings ALTER COLUMN logo_url TYPE TEXT;

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================
-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (Permitir acceso a usuarios autenticados)
-- Nota: En un entorno de producción estricto, estas políticas deben ajustarse por rol (Dueño, Admin, Empleado).
-- Para este MVP, permitimos lectura/escritura a usuarios autenticados.
CREATE POLICY "Allow authenticated full access on profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on parking_lots" ON parking_lots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on vehicles" ON vehicles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on parking_sessions" ON parking_sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on tariffs" ON tariffs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on app_settings" ON app_settings FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- RETENCIÓN DE HISTORIAL (MÁXIMO 7 DÍAS)
-- ==========================================
-- Crear una función para eliminar sesiones antiguas
CREATE OR REPLACE FUNCTION delete_old_parking_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM parking_sessions
  WHERE exit_time < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- (Opcional) Si tienes pg_cron habilitado en Supabase, puedes programar la tarea:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('delete-old-sessions', '0 0 * * *', $$ SELECT delete_old_parking_sessions(); $$);
```

## Estructura de Roles

1. **Dueño (Super Admin)**: Se crea desde el panel de Supabase o mediante la API.
2. **Administrador**: Es creado por el Dueño desde su panel. Cada administrador está asignado a un parqueadero específico.
3. **Empleado**: Es creado por el Administrador desde su panel. Solo puede operar el parqueadero al que fue asignado.

---

## Mensaje de Commit para GitHub

Copia y pega el siguiente mensaje al hacer tu commit:

```text
perf: Optimización de rendimiento y estados de carga

- perf(ui): Implementación de estados de carga (spinners) en todos los botones de acción principales (crear empleado, guardar configuración, registrar ingreso, registrar salida, etc.) para evitar clics dobles y mejorar la retroalimentación visual.
- perf(employee): Implementación de "debouncing" en la búsqueda de placas para reducir llamadas innecesarias a la base de datos mientras el usuario escribe.
- fix(ui): Corrección de errores menores de linting y limpieza de código no utilizado.
```
