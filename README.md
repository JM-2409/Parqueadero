# Sistema de Parqueaderos (ParkManager)

Sistema completo para la gestión de parqueaderos, con roles de Dueño (Super Admin), Administrador y Empleado.

## Características Principales

- **Landing Page**: Página de inicio completa con información del producto, planes y formulario de contacto funcional.
- **Autenticación por Usuario**: Inicio de sesión simplificado utilizando nombres de usuario en lugar de correos electrónicos.
- **Super Admin (Dueño)**: Gestión global de parqueaderos, creación de administradores con nombre de usuario, configuración de nombre y logo (soporta subida de imágenes).
- **Administrador**: Configuración de tarifas (por minuto, fracción, hora, bloque, día/noche, turnos sumables), creación de **campos personalizados dinámicos (obligatorios u opcionales)** para la admisión, gestión de empleados con nombre de usuario y visualización de historial completo con paginación.
- **Roles Personalizados**: El Administrador puede crear roles específicos (ej. Cajero, Guarda) con permisos granulares y asignarlos a sus empleados.
- **Empleado**: Registro de ingresos y salidas con validación de campos obligatorios, control de turnos obligatorio, cálculo automático de tarifas (incluyendo gabelas/tiempos de gracia), generación e impresión de recibos con numeración consecutiva.
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
Para que las nuevas funcionalidades (Roles personalizados, Parqueaderos privados, Tarifas) funcionen correctamente, **debes ejecutar el siguiente código SQL** en tu base de datos de Supabase:

1. Ve a tu panel de Supabase.
2. En el menú lateral izquierdo, selecciona **SQL Editor**.
3. Haz clic en "New query".
4. Pega y ejecuta el siguiente código:

```sql
-- 1. Crear tabla de configuraciones de aplicación (si no existe)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name TEXT DEFAULT 'Sistema de Parqueaderos',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuraciones por defecto de forma segura
INSERT INTO app_settings (app_name, logo_url)
SELECT 'Sistema de Parqueaderos', ''
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- 2. Variables para parking_lots y sesiones
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS receipt_sequence INTEGER DEFAULT 0;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS allow_employee_view_revenue BOOLEAN DEFAULT false;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS nit TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS total_charged NUMERIC DEFAULT 0;
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS custom_fields_data JSONB DEFAULT '{}'::jsonb;

-- 3. Cerrar Caja
CREATE TABLE IF NOT EXISTS cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id),
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  amount NUMERIC DEFAULT 0,
  closed_by UUID REFERENCES profiles(id)
);

-- 4. Crear tabla de roles personalizados
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Añadir columna de rol personalizado a perfiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

-- 5. Crear tabla de parqueaderos privados
CREATE TABLE IF NOT EXISTS private_parking_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  block TEXT,
  house_or_apartment TEXT,
  owner_name TEXT,
  space_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear Sistema de Suscripciones (Opcional si usas invites)
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  parking_lot_id UUID REFERENCES parking_lots(id),
  used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Deshabilitar RLS temporalmente en las nuevas tablas
ALTER TABLE custom_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_parking_spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures DISABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
```

## Estructura de Roles

1. **Dueño (Super Admin)**: Se crea desde el panel de Supabase o mediante la ruta `/setup-owner`.
2. **Administrador**: Es creado por el Dueño desde su panel. Cada administrador está asignado a un parqueadero específico.
3. **Empleado**: Es creado por el Administrador desde su panel. Solo puede operar el parqueadero al que fue asignado. Puede tener un rol estándar o un **Rol Personalizado** con permisos específicos.

---

## Mensaje de Commit para GitHub

Copia y pega el siguiente mensaje al hacer tu commit:

```text
feat: Roles personalizados, Parqueaderos privados, y búsqueda/edición avanzada

- feat(admin): Implementación de creación y asignación de roles personalizados con selección desde el formulario de empleados. Además incluye opciones de búsqueda y edición.
- feat(admin): Añadido listado de parqueaderos privados permitiendo visualizar, crear, editar y eliminar con datos sobre bloque, casa/apartamento, nombre y número.
- feat(roles): Inclusión en la base de datos de los roles en los "profiles", control de errores para base desactualizada con script fácil de copiar.
- fix(ui): Integración del copiado de scripts SQL y alertas amigables al detectar errores de las tablas `custom_roles` y `private_parking_spaces`.
- refactor(ui): Reemplazados spinners de carga de estilos fijos por un componente Spinner y los mensajes de éxito uniformes con el componente SuccessMessage.
```
