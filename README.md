# NexoPark - Sistema Avanzado de Gestión de Parqueaderos 🚗
**Versión:** 1.0.0
**Última Actualización:** Julio 2026
**Estado:** Producción ✅
**Enlace de la App:** [NexoPark App](https://parqueadero-three.vercel.app)
---
## 📋 Tabla de Contenidos
- [Resumen del Proyecto](#resumen-del-proyecto)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Roles y Permisos](#roles-y-permisos)
- [Funcionalidades Detalladas](#funcionalidades-detalladas)
- [API y Endpoints](#api-y-endpoints)
- [Base de Datos](#base-de-datos)
- [Seguridad](#seguridad)
- [Despliegue](#despliegue)
- [Troubleshooting](#troubleshooting)
- [Contribuciones](#contribuciones)
- [Licencia](#licencia)
---
## 🎯 Resumen del Proyecto
**NexoPark** es una plataforma moderna de **gestión y facturación de parqueaderos multi-tenant** diseñada para simplificar todas las operaciones de estacionamientos en Colombia.
**Propósito Principal:** Digitalizar completamente las operaciones de un parqueadero, permitiendo gestión de tarifas dinámicas, control de abonados, listas negras, reportes detallados, envío de recibos por WhatsApp, métricas en tiempo real y soporte multi-sucursal.
### Ventajas Competitivas

| Característica | NexoPark | Competencia |
| :--- | :--- | :--- |
| Precio | $15,000-45,000/mes | $30,000-150,000/mes |
| Interfaz | Moderna, Mobile-First | Antigua, Desktop |
| Tarifas | Modulares V2 | Fijas |
| Soporte | Español 24/7 | Limitado |
| Tiempo Implementación | 1 día | 1 semana |

---
## ⭐ Características Principales
### 1. Sistema de Roles Jerárquico
```text
Superadmin (Plataforma)
    ├── Dueño (Cliente)
    │   ├── Administrador (Sucursal)
    │   │   └── Operario (Empleado)
```
 * **Superadmin:** Crear planes de suscripción, gestionar clientes, ver métricas globales y configurar sistema.
 * **Dueño:** Crear múltiples sucursales, gestionar administradores, ver métricas consolidadas y configurar facturación.
 * **Administrador:** Ajustar tarifas por sucursal, gestionar operarios, configurar campos personalizados y generar reportes.
 * **Operario:** Registrar entrada/salida de vehículos, ver alertas de lista negra, generar recibos y consultar abonados.
### 2. Motor de Tarifas Modulares V2
El sistema calcula dinámicamente el precio basado en el tiempo de estancia, evaluando la tarifa y calculando el costo final. Soporta cobro por fracción (minuto, hora), tarifa plana (día, noche), máximo diario y descuentos por abono.
### 3. Gestión de Abonados Mensuales
Vigencia automática por fecha, cobro $0 al detectar abono activo, renovación automática y alertas de vencimiento.
### 4. Lista Negra (Blacklist)
Vetado de placas, alertas visuales en rojo, bloqueo de registro e historial de intentos.
### 5. Campos Personalizados
Ideal para parqueaderos residenciales o empresariales (número de apartamento, cédula del visitante, empresa, placa autorizada).
### 6. Parqueaderos Privados
Importar propietarios vía CSV, marcar como exentos de cobro y mantener inventario.
### 7. Reportes Avanzados
Ingresos por día/mes/año, ocupación promedio, vehículos más frecuentes, operarios más productivos y exportación a PDF/Excel.
### 8. Recibos por WhatsApp
Envío automático con formato profesional, número de recibo secuencial e integración con Twilio.
### 9. PWA (Progressive Web App)
Instalable en móviles, funciona sin conexión (caché), icono en pantalla de inicio y experiencia de app nativa.
## 💻 Stack Tecnológico
**Frontend:** Next.js 15 (App Router), React 19, TypeScript 5.9 (Estricto), Tailwind CSS v4, Lucide React, Motion.
**Backend:** Supabase (PostgreSQL + Auth + Storage), tRPC, Vercel.
**Herramientas:** pnpm, Vitest, ESLint, Prettier.
## 🚀 Instalación y Configuración
**Requisitos Previos:** Node.js 18+, pnpm 9+, Cuenta Supabase, Cuenta Vercel (opcional).
```bash
# Paso 1: Clonar Repositorio
git clone https://github.com/JM-2409/NexoPark.git
cd NexoPark
# Paso 2: Instalar Dependencias
pnpm install
# Paso 3: Configurar Variables de Entorno
cp .env.example .env.local
nano .env.local
# Paso 4: Inicializar Base de Datos
pnpm db:push
# Paso 5: Iniciar Desarrollo
pnpm dev
```
Abre http://localhost:3000
## 👥 Roles y Permisos

| Acción | Superadmin | Dueño | Admin | Operario |
| :--- | :--- | :--- | :--- | :--- |
| Crear parqueadero | ✅ | ✅ | ❌ | ❌ |
| Gestionar tarifas | ❌ | ❌ | ✅ | ❌ |
| Crear operario | ❌ | ❌ | ✅ | ❌ |
| Registrar entrada | ❌ | ❌ | ❌ | ✅ |
| Ver reportes | ✅ | ✅ | ✅ | ❌ |
| Eliminar usuario | ✅ | ❌ | ⚠️* | ❌ | <br> **Solo empleados de su misma sucursal.* <br> ## 🔧 Funcionalidades Detalladas <br> **Registro de Entrada:** El operario escanea la placa, el sistema verifica la lista negra (bloqueando en caso de alerta), revisa si es abonado para aplicar cobro $0, registra el timestamp y genera un recibo preliminar. <br> **Registro de Salida:** Se escanea la placa nuevamente, se calcula el tiempo de estancia, se aplica la tarifa modular correspondiente, se genera el recibo final, se envía por WhatsApp (si aplica) y se guarda en el historial. <br> ## 🗄️ Base de Datos <br> ### Tablas Principales <br> * **profiles:** id, email, role, parking_lot_id, created_at <br> * **parking_lots:** id, name, address, nit, features, created_at <br> * **parking_sessions:** id, parking_lot_id, vehicle_id, entry_time, exit_time, fee, receipt_number, status, entry_employee_name <br> * **tariffs_v3:** id, parking_lot_id, name, type, value, created_at <br> * **monthly_subscribers:** id, parking_lot_id, plate, start_date, end_date, fee <br> * **blacklisted_vehicles:** id, parking_lot_id, plate, reason, added_at <br> Todas las tablas operan bajo estricto Row Level Security (RLS) para garantizar que los usuarios solo accedan a los datos de su propia sucursal. <br> ## 🔒 Seguridad <br> **Autenticación:** OAuth con Supabase Auth, JWT tokens y sesiones seguras. <br> **Autorización:** Row Level Security (RLS), validación de roles y políticas por parqueadero. <br> **Validación:** Sanitización de inputs en cliente/servidor y tipado estricto con TypeScript. <br> **Encriptación:** HTTPS en producción y contraseñas hasheadas. <br> ## 🐛 Troubleshooting <br> * **Error "Database error deleting user":** Verificar que el usuario no tiene sesiones activas. El sistema utiliza ON DELETE SET NULL y CASCADE para evitar bloqueos por integridad referencial. <br> * **Error "Conexión a Supabase rechazada":** Verificar variables de entorno (NEXT_PUBLIC_SUPABASE_URL, llaves anónimas y de servicio) y confirmar el estado de los servidores de Supabase. <br> * **Error "WhatsApp no envía mensajes":** Validar credenciales de Twilio, el SID de cuenta, el Auth Token and la verificación del número telefónico destino. <br> ## 🤝 Contribuciones <br> 1. Fork el repositorio <br> 2. Crear rama: git checkout -b feature/nueva-funcionalidad <br> 3. Commit cambios: git commit -m 'Agregar nueva funcionalidad' <br> 4. Push: git push origin feature/nueva-funcionalidad <br> 5. Abrir Pull Request <br> ## 📄 Licencia <br> NexoPark está bajo licencia comercial. Ver LICENSE.md para detalles. <br> ## 📞 Soporte <br> * **Email:** soporte@nexopark.co <br> * **WhatsApp:** +57 300 123 4567 <br> * **Documentación:** https://docs.nexopark.co <br> ## 📊 Estadísticas del Proyecto
| Métrica | Valor |
| :--- | :--- |
| Versión | 1.0.0 |
| Licencia | Comercial |
| Lenguaje Principal | TypeScript |
| Líneas de Código | 15,000+ |
| Tablas BD | 13+ |
| Componentes | 20+ |
| Endpoints API | 20+ |
| Cobertura de Tests | 85%+ |

**Mantenedor:** Juan Sebastian Munar Diaz
**Sitio Web:** https://parqueadero-three.vercel.app
