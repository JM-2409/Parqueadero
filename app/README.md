# Parking Management System (Sistema de Gestión de Parqueaderos)

Una aplicación web moderna y completa para la gestión de parqueaderos, construida con Next.js, React, Tailwind CSS y Supabase.

## 🚀 Características Principales

### 1. Panel de Dueño (Super Admin)
- **Gestión de Parqueaderos:** Crea y administra múltiples sucursales de parqueaderos.
- **Roles Personalizados:** Crea roles específicos (ej. Auditor, Supervisor, Cajero) y asigna permisos detallados a cada uno.
- **Gestión de Administradores:** Asigna administradores a cada sucursal.
- **Configuración Global:** Personaliza el nombre de la aplicación y el logo.

### 2. Panel de Administrador de Parqueadero
- **Gestión de Tarifas:** Configura tarifas por minuto, hora, día o mes para diferentes tipos de vehículos (carros, motos, bicicletas, etc.).
- **Gestión de Empleados:** Crea cuentas para los empleados/cajeros de su sucursal.
- **Campos Personalizados:** Añade campos extra obligatorios u opcionales al registrar un vehículo (ej. Casillero, Observaciones).
- **Ingreso Manual (Histórico):** Registra vehículos y sesiones de parqueo del pasado con fechas y horas exactas.
- **Historial y Reportes:** Visualiza el historial completo de transacciones y vehículos de la sucursal.

### 3. Panel de Empleado (Cajero)
- **Ingreso de Vehículos:** Registra la entrada de vehículos en tiempo real de forma rápida.
- **Salida y Cobro:** Calcula automáticamente la tarifa a cobrar basada en el tiempo de estadía y las tarifas configuradas.
- **Búsqueda Rápida:** Encuentra vehículos activos fácilmente por placa.

### 4. Sistema de Autenticación Moderno
- **Inicio de Sesión Flexible:** Permite iniciar sesión usando un nombre de usuario corto (ej. `admin123`) o un correo electrónico completo.
- **Registro Temporal Integrado:** Opción en la pantalla de inicio de sesión para crear nuevos usuarios de forma rápida (Dueño, Administrador, Empleado).
- **Diseño Animado:** Interfaz de login moderna con animaciones fluidas usando Framer Motion.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Next.js 15 (App Router), React 19
- **Estilos:** Tailwind CSS v4, Framer Motion (Animaciones), Lucide React (Iconos)
- **Backend & Base de Datos:** Supabase (PostgreSQL, Autenticación)
- **Lenguaje:** TypeScript

## 📦 Instalación y Configuración Local

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd <nombre-del-directorio>
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno**
   Crea un archivo `.env.local` en la raíz del proyecto con tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   ```

4. **Configurar la Base de Datos (Supabase)**
   Ejecuta los scripts SQL necesarios en el SQL Editor de tu proyecto en Supabase para crear las tablas (`profiles`, `parking_lots`, `vehicles`, `parking_sessions`, `tariffs`, `app_settings`, `custom_roles`).

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗄️ Estructura de la Base de Datos (Supabase)

Asegúrate de ejecutar este script en el SQL Editor de Supabase para la función de Roles Personalizados:

```sql
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);
```

## 🔒 Notas de Seguridad
- La clave `SUPABASE_SERVICE_ROLE_KEY` tiene permisos de administrador para crear usuarios. **NUNCA** la expongas en el lado del cliente (navegador). Solo debe usarse en Server Actions o API Routes.
- Una vez que hayas creado tus usuarios principales, se recomienda deshabilitar o proteger la pestaña de "Registrarse" en el login para evitar que personas no autorizadas creen cuentas.

---

## 📅 Actualizaciones SQL Requeridas

Corre el siguiente script en tu editor SQL de Supabase para agregar la nueva funcionalidad de suscripciones mensuales y tareas automáticas:

```sql
-- 1. Agregar end_date a suscriptores mensuales
ALTER TABLE monthly_subscribers ADD COLUMN IF NOT EXISTS end_date DATE;
UPDATE monthly_subscribers SET end_date = start_date + INTERVAL '1 month' WHERE end_date IS NULL;

-- 2. Tareas Automáticas (Cron)
-- Habilitar extensión pg_cron (si aún no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear una función para desactivar suscripciones vencidas 
CREATE OR REPLACE FUNCTION deactivate_expired_subscribers()
RETURNS void AS $$
BEGIN
  -- Desactivar aquellos que su end_date sea menor al día de hoy y sigan activos
  UPDATE monthly_subscribers
  SET is_active = false
  WHERE end_date < CURRENT_DATE
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Programar para que corra todos los días a la medianoche (Hora Servidor)
SELECT cron.schedule(
  'deactivate-expired-subs',
  '0 0 * * *',
  'SELECT deactivate_expired_subscribers()'
);
```
