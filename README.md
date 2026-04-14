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
Para que las nuevas funcionalidades (Roles personalizados, Tarifas por turnos, Paginación) funcionen correctamente, **debes ejecutar el siguiente código SQL** en tu base de datos de Supabase:

1. Ve a tu panel de Supabase.
2. En el menú lateral izquierdo, selecciona **SQL Editor**.
3. Haz clic en "New query".
4. Pega y ejecuta el siguiente código:

```sql
-- 1. Crear tabla de roles personalizados
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Añadir columna de rol personalizado a perfiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL;

-- 3. Habilitar RLS para la nueva tabla
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on custom_roles" ON custom_roles FOR ALL USING (auth.role() = 'authenticated');
```

## Estructura de Roles

1. **Dueño (Super Admin)**: Se crea desde el panel de Supabase o mediante la API.
2. **Administrador**: Es creado por el Dueño desde su panel. Cada administrador está asignado a un parqueadero específico.
3. **Empleado**: Es creado por el Administrador desde su panel. Solo puede operar el parqueadero al que fue asignado. Puede tener un rol estándar o un **Rol Personalizado** con permisos específicos.

---

## Mensaje de Commit para GitHub

Copia y pega el siguiente mensaje al hacer tu commit:

```text
feat: Gestión de roles personalizados, tarifas avanzadas y paginación

- feat(admin): Implementación de creación y asignación de roles personalizados con permisos granulares por parte del administrador.
- feat(pricing): Nueva lógica de cálculo de tarifas por turnos (día y noche sumables) con configuración de tiempo de gracia (gabela).
- feat(history): Implementación de paginación y búsqueda del lado del servidor (Supabase) para el historial de administrador y empleado, mejorando el rendimiento con grandes volúmenes de datos.
- fix(roles): Validación de nombres de roles únicos por parqueadero para evitar duplicados.
- refactor(ui): Mejoras en la interfaz de usuario para la configuración de tarifas y visualización de historial.
```
