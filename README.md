# NexoPark v2.0.0

Plataforma web para operar y administrar parqueaderos desde computadores, teléfonos y dispositivos instalados como aplicación web progresiva (PWA).

## Módulos

### Panel administrativo

- Consulta de actividad, ingresos, ocupación e historial.
- Gestión de tarifas, operarios, roles, abonados, vehículos y ajustes del parqueadero.
- Control de caja y caja menor.
- Creación de asignaciones de caja menor, inyección de fondos, ampliación de asignaciones y anulación auditada de movimientos.
- Revisión del historial de movimientos y legalizaciones.

### Portería

- Registro de ingreso y salida de vehículos, cálculo de tarifas y emisión de recibos.
- Consulta de actividad e historial del parqueadero.
- Inicio de turno con persistencia local del nombre del operador entre recargas y cierres de la PWA.
- Legalización de asignaciones: varias facturas por entrega, suma automática y devolución del saldo no gastado a caja menor.
- La opción de cierre de caja está reservada al panel administrativo.

## Tecnologías

- Next.js 15 con App Router, React 19 y TypeScript.
- Tailwind CSS 4 y Lucide React.
- Supabase para PostgreSQL, autenticación, almacenamiento y actualizaciones en tiempo real.
- PWA mediante `@ducanh2912/next-pwa`.
- Pruebas con Vitest y análisis estático con ESLint.
- Google Analytics 4 opcional mediante `@next/third-parties`.

## Requisitos

- Node.js compatible con Next.js 15.
- Una instancia de Supabase.
- npm o Bun.

## Instalación

1. Instala las dependencias con `npm ci` o `bun install`.
2. Copia `.env.example` a `.env.local` y completa las variables requeridas:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_APP_NAME=NexoPark
   NEXT_PUBLIC_APP_VERSION=2.0.0
   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
   ```

   `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` es opcional; usa el identificador de medición de Google Analytics 4, por ejemplo `G-XXXXXXXXXX`.

3. En el editor SQL de Supabase, aplica las migraciones del directorio `supabase/migrations` que todavía no estén ejecutadas. Para habilitar caja menor, aplica `20261108190000_caja_menor.sql`.
4. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

5. Abre <http://localhost:3000>.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el entorno de desarrollo. |
| `npm run build` | Genera la compilación de producción. |
| `npm start` | Ejecuta la compilación de producción. |
| `npm run lint` | Analiza el código con ESLint. |
| `npm run test:run` | Ejecuta las pruebas con Vitest. |

## Base de datos y seguridad

La aplicación utiliza Supabase y políticas de seguridad por fila. La migración de caja menor crea saldos por parqueadero, asignaciones, facturas múltiples e historial con estado `activo` o `anulado`. Los cambios de saldo y la legalización se realizan mediante funciones transaccionales de PostgreSQL para evitar saldos negativos y registrar cada movimiento en una sola operación.

El saldo inicial de caja menor es cero y debe cargarse desde el panel administrativo. Las operaciones de fondos, asignaciones y anulaciones validan el rol y el parqueadero en la base de datos. El personal de portería puede consultar las asignaciones de su turno y enviar legalizaciones, pero no puede administrar el saldo ni cerrar la caja general.

No publiques `SUPABASE_SERVICE_ROLE_KEY` ni la guardes en código cliente. Configura los secretos únicamente en el entorno de servidor.

## Despliegue

Configura las variables de entorno requeridas en el servicio de alojamiento, aplica las migraciones pendientes en Supabase y despliega la aplicación con el comando de compilación del proyecto. La PWA solicita la activación de la versión nueva del service worker y toma el control de las páginas abiertas.
