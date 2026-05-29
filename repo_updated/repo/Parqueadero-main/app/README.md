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

## 🗄️ Estructura de la Base de Datos

La aplicación utiliza Supabase como backend (PostgreSQL). Las tablas principales son:

- `profiles`: Perfiles de usuarios vinculados a Auth.
- `parking_lots`: Configuración del parqueadero (capacidad, nombre, dirección, etc.).
- `vehicles`: Registro de vehículos conocidos por su placa, incluyendo campos extra como marca y color.
- `parking_sessions`: Sesiones activas e historial de ingresos y salidas.
- `tariffs_v3`: Reglas de tarifas por tipo de vehículo y tipo de cobro (hora, fracción, día, mes).
- `custom_roles`: Roles personalizados que definen permisos específicos de empleados.
- `monthly_subscribers`: Suscriptores mensuales del parqueadero.
- `blacklisted_vehicles`: Lista negra de vehículos.
- `cash_closures`: Registros de cierres de caja (cuadres).
- `employee_logs`: Registro histórico de inicios y cambios de turno de los operarios.

## 🔄 Correcciones e Interacciones Recientes
- **Control Centralizado de Preferencias**: Las preferencias de flujo de operario (_Impresión automática de recibo, Confirmación de Ingreso y Mostrar campo de Observaciones extra_) se han trasladado al panel de Administración en la pestaña **"Configuración"**. Esto le da al administrador control total sobre la operativa, dejando únicamente la alerta sonora (Pitidos) como la única preferencia configurable por el empleado en su estación.
- **Mejoras UX en Formulario de Ingreso**: Se añadió un modal de confirmación antes de registrar el ingreso de un vehículo para evitar transacciones accidentales. Además, se modernizó la selección del tipo de vehículo usando tarjetas visuales interactivas y se reestilizaron los imputs de placa asimilando estándares modernos con Tailwind CSS.
- **Interfaz de Empleado Modernizada**: Rediseño completo responsivo del panel de empleados, asegurando el correcto encaje en dispositivos móviles, un diseño moderno estilo dashboard sin salirse de la pantalla y cobro de tarifas automático, inmodificable por el empleado para una mayor seguridad.
- **Lector de Placas Retirado y Editor Integrado**: El OCR (lector con cámara) fue retirado por su inestabilidad, y para compensar los errores de digitación se añadió de forma exclusiva para la administración la función de **"Editar Placa"** en el panel histórico de todos los registros.
- **Historial de Operario Mejorado**: Opción de dar salida directamente desde el historial si la sesión no ha finalizado.
- **Seguridad en Historial Administrador**: Inclusión de un modal de confirmación antes de eliminar el historial de una sesión de parqueo permanentemente y optimización anti-saturación en buscadores de Placa/Operario con _debounce_ (300ms).
- **Autocompletado Inteligente**: Al digitar una placa de vehículo registrado previamente en el sistema de la sucursal (o general), los campos extra (`Marca`, `Color`, etc) se mapean y populán automáticamente minimizando el tiempo de ingreso del personal.
- **Transiciones de Múltiples Operarios**: Inclusión de un botón "Cambiar" en el panel de control del empleado, evitando el cierre de sesión de la cuenta máster. Permite rotación de turnos (cambio de nombre de operario) de manera fluida y rápida en la misma estación de trabajo.
- **Gestión Unificada de Tarifas**: Control de visualización V3 con botones de eliminar bloqueantes intermedios para evitar clics dobles, y prevención estricta de políticas de seguridad para simplificar la corrección de errores en la eliminación.

## 🔒 Notas de Seguridad
- La clave `SUPABASE_SERVICE_ROLE_KEY` tiene permisos de administrador para crear usuarios. **NUNCA** la expongas en el lado del cliente (navegador). Solo debe usarse en Server Actions o API Routes.
- Una vez que hayas creado tus usuarios principales, se recomienda deshabilitar o proteger la pestaña de "Registrarse" en el login para evitar que personas no autorizadas creen cuentas.
