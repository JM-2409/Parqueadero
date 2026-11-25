# NexoPark v2.4.0

Plataforma web para operar y administrar parqueaderos desde computadores, teléfonos y dispositivos instalados como aplicación web progresiva (PWA).

## Novedades de la versión 2.4.0

- Caja y caja menor ahora se administran desde una sola sección.
- Transferir dinero descuenta el recaudo disponible y abona el mismo monto al fondo para gastos en una operación atómica.
- Los reversos actualizan ambos saldos y dejan historial en Caja y en el fondo.
- Se eliminó la opción duplicada de agregar fondos manualmente desde caja menor.

## Novedades de la versión 2.3.0

- Página principal actualizada con información ampliada sobre las funciones, novedades y planes activos.
- Formularios de contacto e inicio de sesión renovados con mejoras de legibilidad y accesibilidad.
- Al ingresar, la pantalla de acceso se reemplaza en el historial del navegador; al volver atrás, la sesión autenticada se conserva.
- Diseño adaptable de las páginas públicas mejorado para computadores y dispositivos móviles.

## Novedades de la versión 2.2.0

- Menú administrativo agrupado por áreas para encontrar más rápido las funciones de operación y configuración.
- Caja y retiros en un solo flujo; los retiros se registran desde el módulo Caja.
- Actualizaciones en tiempo real para las vistas compatibles de parqueaderos privados.
- Carga optimizada de imágenes en historiales, recibos e inspecciones.
- Validaciones y correcciones para mejorar la confiabilidad de las conexiones y del código.

## Módulos

### Panel administrativo

- Consulta de actividad, ingresos, ocupación e historial.
- Gestión de tarifas, operarios, roles, abonados, vehículos y ajustes del parqueadero.
- Una sola sección de Caja para consultar el recaudo, transferir dinero al fondo para gastos y realizar cierres.
- Cada transferencia descuenta el recaudo disponible y abona el mismo monto al fondo en una operación atómica.
- Creación de asignaciones, ampliaciones, legalizaciones y devoluciones con historial auditable.
- Revisión del historial de movimientos y legalizaciones.

### Portería

- Registro de ingreso y salida de vehículos, cálculo de tarifas y emisión de recibos.
- Consulta de actividad e historial del parqueadero.
- Inicio de turno con persistencia local del nombre del operador entre recargas y cierres de la PWA.
- Legalización de asignaciones: varias facturas por entrega, suma automática y devolución del saldo no gastado a caja menor.
- La opción de cierre de caja está reservada al panel administrativo.

### Superadministrador

- Gestión de parqueaderos, administradores, dispositivos, métricas y configuración global.
- Administración de planes, facturas y pagos manuales de suscripción.
- La vigencia y el plan se actualizan de forma transaccional al confirmar el pago completo de una factura.
- Los precios publicados en la página principal se leen de los planes activos en Supabase.

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
   NEXT_PUBLIC_APP_VERSION=2.4.0
   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
   ```

   `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` es opcional; usa el identificador de medición de Google Analytics 4, por ejemplo `G-XXXXXXXXXX`.

3. Aplica en orden las migraciones versionadas de `supabase/migrations`, verificando primero cuáles ya aparecen en el historial del proyecto. No ejecutes todos los archivos SQL de `sql_scripts` ni repitas scripts antiguos: varios son correcciones manuales históricas y no forman una secuencia segura de migraciones. Para habilitar caja menor, asegúrate de que `20261108190000_caja_menor.sql` ya se haya aplicado. Para las actualizaciones en tiempo real de parqueaderos privados, revisa también `20261118142000_habilitar_realtime_parqueadero_privado.sql`; para las transferencias y sus reversos, revisa `20261125133033_unificar_caja_minor_transferencias.sql` y `20261125133257_proteger_reverso_transferencias.sql`.

   En la instancia Parqueadero, la migración de caja menor ya existe en la base y está registrada como aplicada en el historial remoto. No la vuelvas a ejecutar manualmente.
   La migración de actualizaciones en tiempo real también fue aplicada en esa instancia. Verifica el historial antes de aplicarla en otros proyectos.
   La migración `20261125133033_unificar_caja_minor_transferencias.sql` también se aplicó en Parqueadero. Verifica el historial antes de aplicarla en otra instancia.
   La protección de reversos `20261125133257_proteger_reverso_transferencias.sql` también quedó aplicada en Parqueadero.
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

La aplicación utiliza Supabase y políticas de seguridad por fila para limitar los registros al parqueadero del usuario. La migración de caja menor crea saldos por parqueadero, asignaciones, facturas múltiples e historial con estado `activo` o `anulado`. Los cambios de saldo y la legalización se realizan mediante funciones transaccionales de PostgreSQL para evitar saldos negativos y registrar cada movimiento en una sola operación.

El saldo inicial de caja menor es cero y se alimenta transfiriendo dinero desde Caja. La transferencia, su registro como retiro y el abono al fondo se realizan en una sola transacción; si falla una parte, no se guarda ninguna. Las operaciones de asignaciones y anulaciones validan el rol y el parqueadero en la base de datos. El personal de portería puede consultar las asignaciones de su turno y enviar legalizaciones, pero no puede administrar el saldo ni cerrar la caja general.

Las funciones transaccionales de caja menor usan `SECURITY DEFINER` y sólo permiten ejecución a usuarios autenticados; sus validaciones de rol y parqueadero son obligatorias. No concedas su ejecución a `anon` ni a `public`. Para quitar el aviso de contraseñas filtradas, activa la [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) en la configuración de autenticación de Supabase.

La gestión de suscripciones usa `subscription_plans`, `subscription_invoices` y `subscription_payments`. Los planes activos son visibles públicamente para mostrar precios; sólo el superadministrador puede modificarlos. Los pagos se registran manualmente y la función `record_subscription_payment` confirma la factura y actualiza el plan y la vigencia en una sola transacción. No hay integración con una pasarela ni cobros automáticos.

No publiques `SUPABASE_SERVICE_ROLE_KEY` ni la guardes en código cliente. Configura los secretos únicamente en el entorno de servidor.

## Despliegue

Configura las variables de entorno requeridas en el servicio de alojamiento, aplica las migraciones pendientes en Supabase y despliega la aplicación con el comando de compilación del proyecto. En Vercel, actualiza `NEXT_PUBLIC_APP_VERSION` a `2.4.0` en los entornos correspondientes para que la página pública y las vistas internas muestren la versión correcta. La PWA solicita la activación de la versión nueva del service worker y toma el control de las páginas abiertas.
