# Sistema de Parqueaderos

Sistema completo para la gestión de parqueaderos, con roles de Dueño (Super Admin), Administrador y Empleado.

## Características Principales

- **Super Admin (Dueño)**: Gestión global de parqueaderos, creación de administradores, configuración de nombre y logo (soporta subida de imágenes).
- **Administrador**: Configuración de tarifas (por minuto, fracción, hora, bloque), campos personalizados obligatorios/opcionales, gestión de empleados y visualización de historial completo.
- **Empleado**: Registro de ingresos y salidas, control de turnos obligatorio, cálculo automático de tarifas, generación e impresión de recibos.
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
Para que las nuevas funcionalidades (Campos personalizados, Control de turnos y Logo en Base64) funcionen correctamente, **debes ejecutar el siguiente código SQL** en tu base de datos de Supabase:

1. Ve a tu panel de Supabase.
2. En el menú lateral izquierdo, selecciona **SQL Editor**.
3. Haz clic en "New query".
4. Pega y ejecuta el siguiente código:

```sql
-- Añadir soporte para campos personalizados en los parqueaderos
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;

-- Añadir soporte para el control de turnos y datos extra en las sesiones
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS entry_employee_name TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS exit_employee_name TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- Asegurar que el logo pueda almacenar imágenes en Base64 (texto largo)
ALTER TABLE app_settings ALTER COLUMN logo_url TYPE TEXT;
```

## Estructura de Roles

1. **Dueño (Super Admin)**: Se crea una única vez accediendo a la ruta `/setup`.
2. **Administrador**: Es creado por el Dueño desde su panel. Cada administrador está asignado a un parqueadero específico.
3. **Empleado**: Es creado por el Administrador desde su panel. Solo puede operar el parqueadero al que fue asignado.
