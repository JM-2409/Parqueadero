# Sistema de Gestión de Parqueaderos 🚗

**🌐 Enlace de la aplicación en producción:** [https://parqueadero-three.vercel.app/](https://parqueadero-three.vercel.app/)

## Resumen del Proyecto 📝
Este es un sistema avanzado de **gestión y facturación de parqueaderos multi-tenant** (ideal para una o múltiples sucursales) desarrollado con **Next.js 15, Tailwind CSS v4 y Supabase**.

Su propósito principal es simplificar y digitalizar todas las operaciones de un estacionamiento moderno, permitiendo a los administradores crear tarifas dinámicas, llevar el control de abonados mensuales (y listas negras), generar reportes detallados y enviar recibos directamente por WhatsApp a los clientes.

El sistema está dividido por roles (Dueño/Superadmin, Administrador de sucursal, y Operario), manteniendo entornos limpios, seguros y optimizados con métricas en tiempo real a través de websockets.

---

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
  - **Formularios Dinámicos Personalizados:** Si el parqueadero es para visitas residenciales o empresariales, el administrador puede exigir datos obligatorios (EJ: *"Número de Apartamento"*, *"Cédula del Visitante"*).
  - **Parqueaderos Privados (Propietarios):** Posibilidad de importar vía CSV los parqueaderos de los residentes, para marcarlos como exentos de cobro y mantener el inventario en orden.
- **UX Optimizada:**
  - Esqueletos de carga (Skeleton Loaders) para mejorar la percepción de velocidad.
  - Botón de escáner en cámara (preparado para módulo futuro de lectura de placas automática LPR).
  - Interfaz de usuario diseñada 100% para dispositivos móviles (Mobile First).

## Stack Tecnológico 💻
- **Base del Frontend:** Next.js 15+ (App Router), React 19.
- **Estilos:** Tailwind CSS v4, Lucide React (Íconos vectoriales).
- **Backend / Base de Datos:** Supabase (PostgreSQL), Autenticación nativa de Supabase.

## Motor de la Aplicación ⚡
El núcleo del sistema reside en:
1. **Verificación de Seguridad a Nivel de Filas (RLS - Row Level Security):** Cada tabla filtra la información basada en el ID de la sucursal (`parking_lot_id`), aislando los datos de manera segura (Multi-Tenant).
2. **Cálculo de Tarifas (`pricing.ts`):** Basado en el registro de tiempo `(Hora de Entrada -> Hora de Salida)`, evalúa en cascada contra la tabla `tariffs_v3` para definir si cobra minutos, horas, o la tarifa máxima diaria.

## Implementación de Base de Datos Completa (Setup SQL) 🗄️
Ejecuta el siguiente script en tu editor SQL de Supabase para inicializar todas las tablas requeridas.

```sql
-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Sistema de Base y Perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('superadmin', 'admin', 'employee')) DEFAULT 'employee',
  parking_lot_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Entidades Principales
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  nit TEXT,
  phone TEXT,
  total_spaces INTEGER NOT NULL,
  features JSONB DEFAULT '{"whatsapp_receipts": true, "monthly_subscribers": true, "blacklist": true, "private_spaces": false, "custom_fields": true}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  grace_period_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- El campo parking_lot_id de profiles ahora es llave foránea
ALTER TABLE profiles ADD CONSTRAINT fk_parking_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL,
  type TEXT CHECK (type IN ('carros', 'motos', 'bicicletas')) NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plate)
);

-- 4. Sesiones de Parqueo
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
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_revenue INTEGER NOT NULL DEFAULT 0,
  total_vehicles INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- (8) Aplicamos Políticas de Seguridad (RLS) Básicas (Permisivas para el entorno PWA Inicial)
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

## Configuración Dinámica y Arquitectura 🏗️
- **Configuración Global del Nombre:** El nombre de la aplicación ahora es completamente dinámico y no está escrito en código (hardcodeado). Puedes cambiar "Sistema de Parqueaderos" o el nombre de tu marca definiendo la variable `NEXT_PUBLIC_APP_NAME` en el archivo `.env`. Este cambio se reflejará en toda la plataforma (Estructura visual, Metadatos, Encabezados y Pie de página).
- **Modelo Multi-Tenant Escalable:** Se implementó una base SQL no destructiva para agrupar múltiples sucursales bajo una misma entidad "Compañía" (Tenant). Esto permite que clientes corporativos puedan gestionar varias sedes desde una cuenta maestra sin mezclar datos con otros inquilinos (tenants).
- **Seguridad en Integraciones de Terceros:** Las credenciales y números de teléfono de WhatsApp (Twilio) pasaron de estar escritas directamente en el código a requerir estrictamente las variables de entorno (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). El servidor arroja un error 500 para evitar fugas si no están configuradas correctamente.

## Limpieza y Organización de Código 🧹
- **Eliminación de Archivos Residuales:** Se eliminaron de la raíz del proyecto múltiples archivos `.js` y `.sh` que funcionaban como scripts de correcciones o parches temporales y que ya no eran requeridos para la funcionalidad activa (por ejemplo, remanentes de modo oscuro, actualizaciones de estilos temporales).
- **Organización de Esquemas de Base de Datos:** Todos los archivos de migración y estructuración de base de datos (`.sql`), que anteriormente se encontraban dispersos en la raíz del proyecto, han sido centralizados dentro del nuevo directorio `sql_scripts/` para mantener un área de trabajo ordenada.

## Correcciones e Interacciones Recientes 🔄
- **Seguridad de Equipos y Dispositivos**: Se ha añadido un módulo completo de autorización de dispositivos de acceso. Los superadministradores pueden habilitar opcionalmente el requerimiento de aprobación de equipos por parqueadero. Cuando está activo, los empleados y administradores deben recibir aprobación en el panel (pestaña "Equipos" o ícono de campana de notificaciones) para ingresar con nuevos dispositivos, fortaleciendo el control y la seguridad de inicio de sesión. **Corrección Reciente:** Se corrigió un error en el inicio de sesión donde el sistema omitía verificar esta configuración (al no solicitar el campo `features`), permitiendo el acceso directo sin aprobación y sin registrar el equipo. Ahora la validación de la configuración por cada parqueadero funciona correctamente durante el login.
- **Corrección de Impresión de Recibos:** Se ajustaron las reglas CSS de impresión global (`@media print`) para garantizar que al imprimir el recibo (ya sea físico o en PDF) **solo se genere una página**, eliminando el error visual de la página en blanco adicional causado por alturas fijas (`100vh`).
- **Corrección de Seguridad en Inicialización de Usuarios**: Se actualizó el flujo de creación para que, si el sistema está vacío (sin superadministradores), solo se permita crear y registrar estrictamente un usuario con el rol de `superadmin`. Se bloquea la creación no autenticada de cualquier otro rol.
- **Corrección de Seguridad en Preferencias Locales**: Se implementó validación estricta y limitación por lista de permitidos para acceder a los ajustes de usuario en `localStorage` (Mitigación de XSS), previniendo la inyección de código o la manipulación de estados sensibles por parte del cliente.
- **Corrección de Seguridad en Creación de Usuarios**: Se implementó una validación de autorización en la acción del servidor `createUser` exigiendo el `token` del usuario en sesión y validando que posea el rol de `superadmin` o `admin` para prevenir la creación de usuarios no autorizados mediante peticiones a la API directamente.
- **Envío de Recibos por WhatsApp (Twilio)**: Se integró la API de Twilio para enviar automáticamente una imagen del recibo de parqueo vía WhatsApp de forma segura. Adicionalmente, el ArrayBuffer de imágenes a Supabase Storage ahora se manda nativamente solucionando la corrupción de archivos.
- **Generación de Imagen de Recibo**: Nuevo punto final (`/api/receipt-image`) que genera un recibo en formato imagen `.png` sobre la marcha con los detalles de la sesión.
- **Panel Principal del Operario**: Nueva sección de "Resumen Rápido" en el panel del empleado que muestra el número de vehículos parqueados, suscripciones activas y vehículos vetados.
- **Tiempo de Cortesía Flexible**: Ahora puedes configurar los minutos de cortesía en la tabla de configuración. Esto cubre tanto los minutos iniciales de estadía para que cuente como gratis (Entrada de Cortesía) como el rango de tiempo de los turnos de Día/Noche. Por ejemplo, salir 15 minutos después de terminado el turno no cobrará el siguiente rango horario, o entrar 15 minutos antes de que empiece un turno lo arrastrará al siguiente evitando dobles cobros inesperados.
- **Autocompletado Inteligente**: Al digitar una placa de vehículo registrado previamente en el sistema de la sucursal (o general), los campos adicionales (`Marca`, `Color`, etc) se mapean y llenan automáticamente (Ahora extendido a Ingreso Manual y Registro de Abonados Mensuales).
- **Previsualización de Recibos y Envíos**: Al registrar la salida, o al seleccionar un recibo del historial en ambos paneles (Administración y Empleado), ahora el sistema mostrará la previsualización del recibo automáticamente antes de ofrecer la opción final de enviarlo por WhatsApp (con botón dedicado) o imprimirlo de manera física.
- **Actualizaciones en Tiempo Real**: Se ha integrado WebSockets al panel de operarios y de administración, de este modo cualquier cambio desde otra caja o estación de trabajo (ej. ingreso/salida/forzado) se refleja automáticamente en la pantalla de los demás sin necesidad de recargar la página.
- **Borrado de Registros Defectuosos**: Se añadió temporalmente el botón de eliminación de registros permanente ("Borrar Registro" con el ícono rojo de bote de basura en Detalles de Acciones) para poder solucionar el problema de vehículos atrapados.
- **Formato Inteligente de Recibos y Exportación**: Los campos estáticos (Marca, Color, Propietario) han sido removidos de los bloques desplegables del historial y delegados directamente a los datos adicionales dinámicos `custom_fields_data` para reportes precisos.
- **Exportados en CSV Completos**: La exportación ahora lee las columnas dinámicas de la configuración de la sucursal y extrae `custom_fields_data` evitando vacíos en el Excel, proveyendo al contable una tabla adaptativa.
- **Exportación a Excel (XLSX)**: Se integró la librería `xlsx` para permitir a los empleados exportar el historial de registros a un documento en formato Microsoft Excel de un solo clic.
- **Cierre de Caja del Operario**: Añadido botón "Cerrar Caja" en el panel del operario. Registra el acumulado del turno en la tabla `cash_closures` y restablece el contador de recaudos sin afectar registros activos.
- **Gráficas Interactivas de Datos (Recharts)**: En el panel de Administración central, se integró `recharts` para proveer herramientas de análisis enriquecidas en la gráfica de recaudo de 7/30 días usando recuadros de información personalizables.
- **Estabilización de Conexión con Supabase**: Se restauraron las variables locales de entorno `.env.local` logrando estabilizar la conexión del API con la Base de datos sin recurrir a datos de prueba.

## Actualizaciones de Interfaz de Usuario 🎨
- **Panel de Administración Moderno:** Se ha rediseñado la interfaz de administración para utilizar una arquitectura visual con **Módulos CSS**, separando la lógica de negocio de los estilos de Tailwind para permitir un mantenimiento limpio. Se migró de una paleta con fondo índigo a un esquema minimalista monocromático de alto contraste (Blanco y colores Pizarra) que garantiza que el texto nunca se pierda en fondos claros y mejora la legibilidad tanto en resoluciones móviles como de escritorio.
